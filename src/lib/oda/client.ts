import { config } from "@/lib/config"
import { kvGet, kvSet } from "@/lib/kv/client"

const MAX_RETRIES = 3
const RETRY_STATUS_CODES = [429, 503]

function cacheKey(path: string): string {
  let hash = 0
  for (let i = 0; i < path.length; i++) {
    const char = path.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0")
  return `oda:query:${hex}`
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchFromOda<T>(path: string, ttl?: number): Promise<T> {
  const key = cacheKey(path)
  const cached = await kvGet<T>(key)
  if (cached) return cached

  const url = `${config.oda.baseUrl}${path}${path.includes("?") ? "&" : "?"}$format=json`

  let lastError: Error | null = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await delay(Math.pow(2, attempt - 1) * 1000)
    }

    const response = await fetch(url)

    if (response.ok) {
      const data = (await response.json()) as T
      await kvSet(key, data, ttl ?? config.cache.odaTtl)
      if (config.oda.requestDelayMs > 0) {
        await delay(config.oda.requestDelayMs)
      }
      return data
    }

    if (RETRY_STATUS_CODES.includes(response.status) && attempt < MAX_RETRIES) {
      lastError = new Error(`ODA API returned ${response.status}`)
      continue
    }

    throw new Error(`ODA API error: ${response.status} for ${path}`)
  }

  throw lastError ?? new Error(`ODA API failed after ${MAX_RETRIES} retries`)
}

export async function fetchSagstrin(id: number) {
  return fetchFromOda<import("./types").OdaSagstrin>(
    `/Sagstrin(${id})`,
    config.cache.odaTtlHistorical
  )
}

export async function fetchSag(id: number) {
  return fetchFromOda<import("./types").OdaSag>(
    `/Sag(${id})`,
    config.cache.odaTtlHistorical
  )
}

export async function fetchStemmer(afstemningId: number) {
  const pageSize = 200
  const allStemmer: import("./types").OdaStemme[] = []
  let skip = 0

  while (true) {
    const response = await fetchFromOda<{ value: import("./types").OdaStemme[] }>(
      `/Stemme?$filter=afstemningid eq ${afstemningId}&$expand=Akt%C3%B8r&$top=${pageSize}&$skip=${skip}`
    )
    allStemmer.push(...response.value)
    if (response.value.length < pageSize) break
    skip += pageSize
  }

  return { value: allStemmer }
}
