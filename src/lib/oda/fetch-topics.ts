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

type OdaEmneordSag = {
  readonly emneordid: number
  readonly sagid: number
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
 * Cached at `popular-topics` with 3h TTL.
 */
export async function fetchPopularTopics(): Promise<TopicInfo[]> {
  const cacheKey = "popular-topics"
  const cached = await kvGet<TopicInfo[]>(cacheKey)
  if (cached) return cached

  const data = await fetchOdaRaw<OdaResponse<OdaEmneord>>(
    `/Emneord?$filter=typeid eq 1&$top=20&$orderby=emneord asc`
  )

  const topics: TopicInfo[] = data.value.map((e) => ({
    id: e.id,
    name: e.emneord,
    slug: toSlug(e.emneord),
  }))

  await kvSet(cacheKey, topics, TOPIC_TTL)
  return topics
}

/**
 * Look up an Emneord by its slug (lowercased emneord with spaces replaced by hyphens).
 * Fetches all typeid=1 emneord (cached), then matches by slug.
 * Returns null if not found.
 */
export async function fetchEmneordBySlug(slug: string): Promise<{ id: number; name: string } | null> {
  const cacheKey = "all-emneord-t1"
  let allEmneord = await kvGet<readonly OdaEmneord[]>(cacheKey)

  if (!allEmneord) {
    const data = await fetchOdaRaw<OdaResponse<OdaEmneord>>(
      `/Emneord?$filter=typeid eq 1&$top=100`
    )
    allEmneord = data.value
    await kvSet(cacheKey, allEmneord, TOPIC_TTL)
  }

  const match = allEmneord.find((e) => toSlug(e.emneord) === slug)
  if (!match) return null

  return { id: match.id, name: match.emneord }
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
 * Steps:
 *   1. Fetch EmneordSag links (uncached)
 *   2. For each sagid, fetch the most recent Afstemning with Sagstrin/Sag expand (uncached)
 *   3. Fetch party votes via fetchPartyVotes (has its own cache)
 *   4. Map to VoteSummary
 * The processed page is cached at `topic:${emneordId}:skip=${skip}` with 3h TTL.
 */
export async function fetchTopicVotes(
  emneordId: number,
  top: number,
  skip: number
): Promise<{ votes: VoteSummary[]; exhausted: boolean }> {
  const cacheKey = `topic:${emneordId}:skip=${skip}`
  const cached = await kvGet<{ votes: VoteSummary[]; exhausted: boolean }>(cacheKey)
  if (cached) return cached

  // Step 1: Fetch EmneordSag links
  const emneordSagData = await fetchOdaRaw<OdaResponse<OdaEmneordSag>>(
    `/EmneordSag?$filter=emneordid eq ${emneordId}&$top=${top}&$skip=${skip}&$orderby=sagid desc`
  )

  const exhausted = emneordSagData.value.length < top

  // Step 2: For each sagid, fetch most recent Afstemning
  const votes = await pMap(
    emneordSagData.value,
    async (link) => {
      const afstemningData = await fetchOdaRaw<OdaResponse<OdaAfstemning>>(
        `/Afstemning?$filter=Sagstrin/sagid eq ${link.sagid}&$top=1&$orderby=opdateringsdato desc&$expand=Sagstrin/Sag`
      )

      const afstemning = afstemningData.value[0]
      if (!afstemning) return null

      // Step 3: Fetch party votes (cached in Redis)
      const { partyVotes, totals } = await fetchPartyVotes(afstemning.id)

      const sagstrin = afstemning.Sagstrin ?? null
      const sag = sagstrin?.Sag ?? null
      const periodeKode = sag ? await getPeriodeKode(sag.periodeid) : null

      // Step 4: Map to VoteSummary
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

  const filteredVotes = votes.filter((v): v is VoteSummary => v !== null)
  const result = { votes: filteredVotes, exhausted }

  await kvSet(cacheKey, result, TOPIC_TTL)
  return result
}
