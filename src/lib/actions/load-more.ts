"use server"

import { fetchVoteSummaries } from "@/lib/oda/fetch-votes"
import type { VoteSummary } from "@/types/vote"
import { config } from "@/lib/config"

export async function loadMoreVotes(skip: number): Promise<VoteSummary[]> {
  return fetchVoteSummaries(config.pagination.defaultPageSize, skip)
}
