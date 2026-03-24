"use server"

import { fetchFromOda, fetchStemmerRaw } from "@/lib/oda/client"
import { mapToVoteSummary, mapStemmeToPartyVotes } from "@/lib/oda/mapper"
import { AFSTEMNINGSTYPE_MAP } from "@/lib/oda/constants"
import { kvGet, kvSet } from "@/lib/kv/client"
import type { OdaAfstemning, OdaResponse, OdaSag, OdaSagstrin } from "@/lib/oda/types"
import type { PartyVote, VoteSummary, VoteTotals } from "@/types/vote"
import { config } from "@/lib/config"

function escapeODataString(value: string): string {
  return value.replace(/'/g, "''")
}

async function getPartyVotes(afstemningId: number): Promise<{ partyVotes: PartyVote[]; totals: VoteTotals }> {
  const key = `partyvotes:${afstemningId}`
  const cached = await kvGet<{ partyVotes: PartyVote[]; totals: VoteTotals }>(key)
  if (cached) return cached

  const stemmerResponse = await fetchStemmerRaw(afstemningId)
  const result = mapStemmeToPartyVotes(stemmerResponse.value)
  await kvSet(key, result, 0)
  return result
}

export async function searchVotes(query: string, skip = 0): Promise<VoteSummary[]> {
  if (!query || query.trim().length < 2) return []

  const escaped = escapeODataString(query.trim())
  const sagResponse = await fetchFromOda<OdaResponse<OdaSag>>(
    `/Sag?$filter=contains(titel,'${escaped}') or contains(titelkort,'${escaped}')&$top=${config.pagination.defaultPageSize}&$skip=${skip}&$orderby=opdateringsdato desc`
  )

  const summaries: VoteSummary[] = []

  for (const sag of sagResponse.value) {
    const sagstrinResponse = await fetchFromOda<OdaResponse<OdaSagstrin>>(
      `/Sagstrin?$filter=sagid eq ${sag.id}&$top=1&$orderby=dato desc`
    )
    if (sagstrinResponse.value.length === 0) continue

    const sagstrin = sagstrinResponse.value[0]
    const afstemningerResponse = await fetchFromOda<OdaResponse<OdaAfstemning>>(
      `/Afstemning?$filter=sagstrinid eq ${sagstrin.id}&$top=1&$orderby=opdateringsdato desc`
    )
    if (afstemningerResponse.value.length === 0) continue

    const afstemning = afstemningerResponse.value[0]
    const { partyVotes, totals } = await getPartyVotes(afstemning.id)

    summaries.push(
      mapToVoteSummary(
        afstemning,
        sagstrin,
        sag,
        partyVotes,
        totals,
        AFSTEMNINGSTYPE_MAP[afstemning.typeid] ?? "Ukendt"
      )
    )
  }

  return summaries
}
