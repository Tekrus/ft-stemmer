"use server"

import { fetchFromOda } from "@/lib/oda/client"
import { mapToVoteSummary } from "@/lib/oda/mapper"
import { AFSTEMNINGSTYPE_MAP } from "@/lib/oda/constants"
import { fetchPartyVotes } from "@/lib/oda/fetch-votes"
import type { OdaAfstemning, OdaResponse } from "@/lib/oda/types"
import type { VoteSummary } from "@/types/vote"
import { pMap } from "@/lib/pmap"
import { config } from "@/lib/config"

function escapeODataString(value: string): string {
  return value.replace(/'/g, "''")
}

export async function searchVotes(query: string, skip = 0): Promise<VoteSummary[]> {
  if (!query || query.trim().length < 2) return []

  const escaped = escapeODataString(query.trim())
  const response = await fetchFromOda<OdaResponse<OdaAfstemning>>(
    `/Afstemning?$filter=substringof('${escaped}',Sagstrin/Sag/titel) or substringof('${escaped}',Sagstrin/Sag/titelkort)&$top=${config.pagination.defaultPageSize}&$skip=${skip}&$orderby=opdateringsdato desc&$expand=Sagstrin/Sag`
  )

  return pMap(
    response.value,
    async (afstemning) => {
      const sagstrin = afstemning.Sagstrin ?? null
      const sag = sagstrin?.Sag ?? null
      const { partyVotes, totals } = await fetchPartyVotes(afstemning.id)

      return mapToVoteSummary(
        afstemning,
        sagstrin,
        sag,
        partyVotes,
        totals,
        AFSTEMNINGSTYPE_MAP[afstemning.typeid] ?? "Ukendt"
      )
    },
    5
  )
}
