import { fetchVoteSummaries } from "./fetch-votes"
import type { VoteSummary } from "@/types/vote"

export type PartyVoteCategory = "for" | "against"

export type CategorizedVotes = {
  readonly passed: {
    readonly votedFor: readonly VoteSummary[]
    readonly votedAgainst: readonly VoteSummary[]
  }
  readonly rejected: {
    readonly votedFor: readonly VoteSummary[]
    readonly votedAgainst: readonly VoteSummary[]
  }
}

function getPartyStance(vote: VoteSummary, partyAbbr: string): PartyVoteCategory | null {
  const partyVote = vote.partyVotes.find((p) => p.party === partyAbbr)
  if (!partyVote) return null
  if (partyVote.for > partyVote.against) return "for"
  if (partyVote.against > partyVote.for) return "against"
  return null
}

export async function fetchPartyVotes(partyAbbr: string, count = 15): Promise<CategorizedVotes> {
  const votes = await fetchVoteSummaries(count)

  const result: {
    passed: { votedFor: VoteSummary[]; votedAgainst: VoteSummary[] }
    rejected: { votedFor: VoteSummary[]; votedAgainst: VoteSummary[] }
  } = {
    passed: { votedFor: [], votedAgainst: [] },
    rejected: { votedFor: [], votedAgainst: [] },
  }

  for (const vote of votes) {
    const stance = getPartyStance(vote, partyAbbr)
    if (!stance) continue

    const bucket = vote.passed ? result.passed : result.rejected
    if (stance === "for") {
      bucket.votedFor.push(vote)
    } else {
      bucket.votedAgainst.push(vote)
    }
  }

  return result
}
