import { fetchFromOda, fetchSagstrin, fetchSag, fetchStemmerRaw, fetchPeriode } from "./client"
import { mapToVoteSummary, mapStemmeToPartyVotes } from "./mapper"
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
async function fetchPartyVotes(afstemningId: number): Promise<CachedPartyVotes> {
  const key = `partyvotes:${afstemningId}`
  const cached = await kvGet<CachedPartyVotes>(key)
  if (cached) return cached

  const stemmerResponse = await fetchStemmerRaw(afstemningId)
  const result = mapStemmeToPartyVotes(stemmerResponse.value)

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

export async function fetchVoteSummaries(top: number, skip = 0): Promise<VoteSummary[]> {
  const response = await fetchFromOda<OdaResponse<OdaAfstemning>>(
    `/Afstemning?$top=${top}&$skip=${skip}&$orderby=opdateringsdato desc`
  )

  return pMap(
    response.value,
    async (afstemning) => {
      const sagstrin = afstemning.sagstrinid
        ? await fetchSagstrin(afstemning.sagstrinid)
        : null
      const sag = sagstrin
        ? await fetchSag(sagstrin.sagid)
        : null
      const { partyVotes, totals } = await fetchPartyVotes(afstemning.id)
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
}
