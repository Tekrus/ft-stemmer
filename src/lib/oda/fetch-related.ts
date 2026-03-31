import { kvGet, kvSet } from "@/lib/kv/client"
import { config } from "@/lib/config"
import type { OdaResponse } from "./types"

type OdaSambehandling = {
  readonly id: number
  readonly førstesagstrinid: number
  readonly andetsagstrinid: number
}

type OdaSagstrinWithSag = {
  readonly id: number
  readonly sagid: number
  readonly Sag?: {
    readonly id: number
    readonly nummer: string
    readonly titel: string
    readonly titelkort: string
  }
}

export type RelatedSag = {
  readonly sagId: number
  readonly nummer: string
  readonly titel: string
  readonly titelkort: string
}

/** Fetch from ODA without caching the raw response in Redis. */
async function fetchOdaRaw<T>(path: string): Promise<T> {
  const url = `${config.oda.baseUrl}${path}${path.includes("?") ? "&" : "?"}$format=json`
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`ODA API error: ${response.status} for ${path}`)
  }
  if (config.oda.requestDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, config.oda.requestDelayMs))
  }
  return response.json() as Promise<T>
}

/**
 * Fetch related sager (sambehandlinger) for a given sagstrin.
 * Uses a two-step approach: first fetches Sambehandlinger, then fetches linked Sagstrin with Sag.
 * Only the small processed result is cached; raw ODA responses are not stored.
 */
export async function fetchRelatedSager(sagstrinId: number, currentSagId: number): Promise<RelatedSag[]> {
  const cacheKey = `sag-related:${currentSagId}`
  const cached = await kvGet<RelatedSag[]>(cacheKey)
  if (cached) return cached

  const sambehandlinger = await fetchOdaRaw<OdaResponse<OdaSambehandling>>(
    `/Sambehandlinger?$filter=f%C3%B8rstesagstrinid eq ${sagstrinId} or andetsagstrinid eq ${sagstrinId}`
  )

  if (sambehandlinger.value.length === 0) {
    await kvSet(cacheKey, [], 0)
    return []
  }

  // Collect all linked sagstrin IDs (excluding the current one)
  const linkedSagstrinIds = new Set<number>()
  for (const s of sambehandlinger.value) {
    if (s.førstesagstrinid !== sagstrinId) {
      linkedSagstrinIds.add(s.førstesagstrinid)
    }
    if (s.andetsagstrinid !== sagstrinId) {
      linkedSagstrinIds.add(s.andetsagstrinid)
    }
  }

  if (linkedSagstrinIds.size === 0) {
    await kvSet(cacheKey, [], 0)
    return []
  }

  // Fetch each linked sagstrin with its Sag expanded
  const sagMap = new Map<number, RelatedSag>()
  for (const strinId of linkedSagstrinIds) {
    try {
      const sagstrinResponse = await fetchOdaRaw<OdaResponse<OdaSagstrinWithSag>>(
        `/Sagstrin?$filter=id eq ${strinId}&$expand=Sag`
      )
      const sagstrin = sagstrinResponse.value[0]
      if (sagstrin?.Sag && sagstrin.Sag.id !== currentSagId) {
        sagMap.set(sagstrin.Sag.id, {
          sagId: sagstrin.Sag.id,
          nummer: sagstrin.Sag.nummer,
          titel: sagstrin.Sag.titel,
          titelkort: sagstrin.Sag.titelkort,
        })
      }
    } catch {
      // Skip individual failures
    }
  }

  const related: RelatedSag[] = [...sagMap.values()]
  await kvSet(cacheKey, related, 0)
  return related
}
