import { kvGet, kvSet } from "@/lib/kv/client"
import { config } from "@/lib/config"
import type { OdaResponse } from "./types"

type OdaSagAktør = {
  readonly sagid: number
  readonly aktørid: number
  readonly rolleid: number
  readonly Aktør?: {
    readonly id: number
    readonly navn: string
  }
  readonly SagAktørRolle?: {
    readonly id: number
    readonly rolle: string
  }
}

export type SagSponsor = {
  readonly name: string
  readonly role: string
  readonly aktørId: number
}

/** Relevant role IDs: Af (4), Minister (14), Forslagsstiller priv. (16), Forslagsstiller reg. (19) */
const SPONSOR_ROLE_IDS = new Set([4, 14, 16, 19])

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
 * Fetch sponsors (forslagsstillere) for a sag.
 * Only the small processed result is cached; raw ODA responses are not stored.
 */
export async function fetchSagSponsors(sagId: number): Promise<SagSponsor[]> {
  const cacheKey = `sag-sponsors:${sagId}`
  const cached = await kvGet<SagSponsor[]>(cacheKey)
  if (cached) return cached

  const sagAktører = await fetchOdaRaw<OdaResponse<OdaSagAktør>>(
    `/SagAkt%C3%B8r?$filter=sagid eq ${sagId}&$expand=Akt%C3%B8r,SagAkt%C3%B8rRolle`
  )

  const sponsors: SagSponsor[] = sagAktører.value
    .filter((sa) => SPONSOR_ROLE_IDS.has(sa.rolleid))
    .map((sa) => ({
      name: sa.Aktør?.navn ?? "Ukendt",
      role: sa.SagAktørRolle?.rolle ?? "Ukendt",
      aktørId: sa.Aktør?.id ?? sa.aktørid,
    }))

  await kvSet(cacheKey, sponsors, 0)
  return sponsors
}
