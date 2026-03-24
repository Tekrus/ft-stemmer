import { fetchFromOda, fetchSagstrin, fetchSag, fetchStemmer, fetchPeriode } from "./client"
import { mapToVoteSummary } from "./mapper"
import { AFSTEMNINGSTYPE_MAP } from "./constants"
import { pMap } from "@/lib/pmap"
import type { OdaAfstemning, OdaResponse } from "./types"
import type { VoteSummary } from "@/types/vote"

const FETCH_CONCURRENCY = 5

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
      const stemmerResponse = await fetchStemmer(afstemning.id)
      const periodeKode = sag ? await getPeriodeKode(sag.periodeid) : null

      return mapToVoteSummary(
        afstemning,
        sagstrin,
        sag,
        stemmerResponse.value,
        AFSTEMNINGSTYPE_MAP[afstemning.typeid] ?? "Ukendt",
        periodeKode
      )
    },
    FETCH_CONCURRENCY
  )
}
