import { kvGet, kvSet } from "@/lib/kv/client"
import { config } from "@/lib/config"
import { fetchPartyVotes } from "./fetch-votes"
import { fetchPeriode } from "./client"
import { mapToVoteSummary } from "./mapper"
import { AFSTEMNINGSTYPE_MAP } from "./constants"
import { pMap } from "@/lib/pmap"
import type { OdaResponse, OdaAfstemning } from "./types"
import type { VoteSummary } from "@/types/vote"

const TOPIC_TTL = 10800
const FETCH_CONCURRENCY = 5

type OdaEmneord = {
  readonly id: number
  readonly emneord: string
  readonly typeid: number
}

export type TopicInfo = {
  readonly id: number
  readonly name: string
  readonly slug: string
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

function toSlug(emneord: string): string {
  return emneord.toLowerCase().replace(/\s+/g, "-")
}

/**
 * Fetch popular broad-policy topics (typeid=1), return top 20 by name.
 * Deduplicates by slug, preferring the entry with the highest id (newest/active).
 * Cached at `popular-topics` with 3h TTL.
 */
export async function fetchPopularTopics(): Promise<TopicInfo[]> {
  const cacheKey = "popular-topics"
  const cached = await kvGet<TopicInfo[]>(cacheKey)
  if (cached) return cached

  const data = await fetchOdaRaw<OdaResponse<OdaEmneord>>(
    `/Emneord?$filter=typeid eq 1&$top=40&$orderby=emneord asc`
  )

  const bySlug = new Map<string, TopicInfo>()
  for (const e of data.value) {
    const slug = toSlug(e.emneord)
    const existing = bySlug.get(slug)
    if (!existing || e.id > existing.id) {
      bySlug.set(slug, { id: e.id, name: e.emneord, slug })
    }
  }

  const topics = [...bySlug.values()].slice(0, 20)

  await kvSet(cacheKey, topics, TOPIC_TTL)
  return topics
}

/**
 * Look up an Emneord by its slug (lowercased emneord with spaces replaced by hyphens).
 * Uses ODA substringof filter to search, then matches exact slug.
 * When multiple emneord share the same slug, picks the highest id (newest/active).
 */
export async function fetchEmneordBySlug(slug: string): Promise<{ id: number; name: string } | null> {
  const cacheKey = `emneord-slug:${slug}`
  const cached = await kvGet<{ id: number; name: string }>(cacheKey)
  if (cached) return cached

  const searchTerm = slug.replace(/-/g, " ")
  const data = await fetchOdaRaw<OdaResponse<OdaEmneord>>(
    `/Emneord?$filter=substringof('${encodeURIComponent(searchTerm)}',emneord)&$top=50`
  )

  const matches = data.value.filter((e) => toSlug(e.emneord) === slug)
  if (matches.length === 0) return null

  // Prefer typeid=1 (broad policy), then highest id (newest/active)
  const best = matches.sort((a, b) => {
    if (a.typeid === 1 && b.typeid !== 1) return -1
    if (a.typeid !== 1 && b.typeid === 1) return 1
    return b.id - a.id
  })[0]
  const result = { id: best.id, name: best.emneord }
  await kvSet(cacheKey, result, TOPIC_TTL)
  return result
}

/** Cache periodeKode lookups in-memory within a single request */
const periodeCache = new Map<number, string>()

async function getPeriodeKode(periodeid: number): Promise<string | null> {
  const hit = periodeCache.get(periodeid)
  if (hit) return hit
  try {
    const periode = await fetchPeriode(periodeid)
    periodeCache.set(periodeid, periode.kode)
    return periode.kode
  } catch {
    return null
  }
}

/**
 * Fetch votes for a given emneord.
 * Queries Afstemning directly via OData `any()` filter through the
 * Sagstrin→Sag→EmneordSag navigation, so only Sag records that
 * actually have votes are returned.
 * Cached at `topic:${emneordId}:skip=${skip}` with 3h TTL.
 */
export async function fetchTopicVotes(
  emneordId: number,
  top: number,
  skip: number
): Promise<{ votes: VoteSummary[]; exhausted: boolean }> {
  const cacheKey = `topic:${emneordId}:skip=${skip}`
  const cached = await kvGet<{ votes: VoteSummary[]; exhausted: boolean }>(cacheKey)
  if (cached) return cached

  const data = await fetchOdaRaw<OdaResponse<OdaAfstemning>>(
    `/Afstemning?$filter=Sagstrin/Sag/EmneordSag/any(e: e/emneordid eq ${emneordId})&$top=${top}&$skip=${skip}&$orderby=opdateringsdato desc&$expand=Sagstrin/Sag`
  )

  const exhausted = data.value.length < top

  const votes = await pMap(
    data.value,
    async (afstemning) => {
      const { partyVotes, totals } = await fetchPartyVotes(afstemning.id)

      const sagstrin = afstemning.Sagstrin ?? null
      const sag = sagstrin?.Sag ?? null
      const periodeKode = sag ? await getPeriodeKode(sag.periodeid) : null

      return mapToVoteSummary(
        afstemning,
        sagstrin,
        sag,
        partyVotes,
        totals,
        AFSTEMNINGSTYPE_MAP[afstemning.typeid] ?? "Ukendt",
        periodeKode
      )
    },
    FETCH_CONCURRENCY
  )

  const result = { votes, exhausted }
  await kvSet(cacheKey, result, TOPIC_TTL)
  return result
}
