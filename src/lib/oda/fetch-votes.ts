import { fetchFromOda, fetchStemmerRaw, fetchPeriode } from "./client"
import { mapToVoteSummary, mapStemmeToPartyVotes, parseTotalsFromKonklusion } from "./mapper"
import { AFSTEMNINGSTYPE_MAP } from "./constants"
import { pMap } from "@/lib/pmap"
import { kvGet, kvSet } from "@/lib/kv/client"
import type { OdaAfstemning, OdaResponse } from "./types"
import type { PartyVote, VoteSummary, VoteTotals } from "@/types/vote"

const FETCH_CONCURRENCY = 5

type CachedPartyVotes = {
  readonly partyVotes: PartyVote[]
  readonly totals: VoteTotals
}

/**
 * Fetch and cache the compact party vote breakdown for a vote.
 * Raw Stemme+Aktør data is NOT cached (too large). Instead we fetch it,
 * process it into PartyVote[], and cache just that (~1-2KB vs ~100KB+).
 */
export async function fetchPartyVotes(afstemningId: number, konklusion?: string | null): Promise<CachedPartyVotes> {
  const key = `partyvotes:${afstemningId}`
  const cached = await kvGet<CachedPartyVotes>(key)

  if (cached) {
    // Re-derive totals from konklusion when stale cache has zero vote data
    const hasNoTotals = !cached.totals.for && !cached.totals.against
    if (hasNoTotals && konklusion) {
      const parsed = parseTotalsFromKonklusion(konklusion)
      if (parsed) {
        const updated = { ...cached, totals: parsed }
        await kvSet(key, updated, 0)
        return updated
      }
    }
    return cached
  }

  const stemmerResponse = await fetchStemmerRaw(afstemningId)
  let result = mapStemmeToPartyVotes(stemmerResponse.value)

  // Fallback: when individual Stemme records are missing, parse totals from konklusion
  if (result.totals.total === 0 && konklusion) {
    const parsed = parseTotalsFromKonklusion(konklusion)
    if (parsed) {
      result = { ...result, totals: parsed }
    }
  }

  await kvSet(key, result, 0)
  return result
}

/** Cache periodeKode lookups in-memory within a single request */
const periodeCache = new Map<number, string>()

async function getPeriodeKode(periodeid: number): Promise<string | null> {
  const cached = periodeCache.get(periodeid)
  if (cached) return cached
  try {
    const periode = await fetchPeriode(periodeid)
    periodeCache.set(periodeid, periode.kode)
    return periode.kode
  } catch {
    return null
  }
}

export type VoteCountByStatus = {
  readonly total: number
  readonly vedtaget: number
  readonly forkastet: number
}

async function fetchVoteCount(filter?: string): Promise<number> {
  const filterParam = filter ? `&$filter=${filter}` : ""
  const response = await fetchFromOda<OdaResponse<OdaAfstemning>>(
    `/Afstemning?$top=0&$inlinecount=allpages${filterParam}`
  )
  return response["odata.count"] != null
    ? parseInt(response["odata.count"], 10)
    : 0
}

export async function fetchVoteCountByStatus(): Promise<VoteCountByStatus> {
  const [total, vedtaget] = await Promise.all([
    fetchVoteCount(),
    fetchVoteCount("vedtaget eq true"),
  ])
  return {
    total,
    vedtaget,
    forkastet: total - vedtaget,
  }
}

export type VoteSummariesResult = {
  readonly votes: VoteSummary[]
  readonly totalCount: number | null
}

export async function fetchVoteSummaries(top: number, skip = 0): Promise<VoteSummariesResult> {
  // Single query with $expand fetches Afstemning + Sagstrin + Sag in one request
  // $inlinecount=allpages returns the total count of matching records
  const response = await fetchFromOda<OdaResponse<OdaAfstemning>>(
    `/Afstemning?$top=${top}&$skip=${skip}&$orderby=opdateringsdato desc&$expand=Sagstrin/Sag&$inlinecount=allpages`
  )

  const totalCount = response["odata.count"] != null
    ? parseInt(response["odata.count"], 10)
    : null

  const votes = await pMap(
    response.value,
    async (afstemning) => {
      const sagstrin = afstemning.Sagstrin ?? null
      const sag = sagstrin?.Sag ?? null
      const { partyVotes, totals } = await fetchPartyVotes(afstemning.id, afstemning.konklusion)
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

  return { votes, totalCount }
}
