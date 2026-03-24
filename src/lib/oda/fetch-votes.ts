import { fetchFromOda, fetchSagstrin, fetchSag, fetchStemmer } from "./client"
import { mapToVoteSummary } from "./mapper"
import { AFSTEMNINGSTYPE_MAP } from "./constants"
import { pMap } from "@/lib/pmap"
import type { OdaAfstemning, OdaResponse } from "./types"
import type { VoteSummary } from "@/types/vote"

const FETCH_CONCURRENCY = 5

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

      return mapToVoteSummary(
        afstemning,
        sagstrin,
        sag,
        stemmerResponse.value,
        AFSTEMNINGSTYPE_MAP[afstemning.typeid] ?? "Ukendt"
      )
    },
    FETCH_CONCURRENCY
  )
}
