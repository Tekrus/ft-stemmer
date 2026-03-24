import { fetchVoteSummaries } from "./fetch-votes"
import type { VoteSummary } from "@/types/vote"

export type PartyStance = "for" | "against"

export type DisagreementVote = {
  readonly vote: VoteSummary
  readonly stanceA: PartyStance
  readonly stanceB: PartyStance
}

export type ComparisonResult = {
  readonly partyA: string
  readonly partyB: string
  readonly disagreements: readonly DisagreementVote[]
  readonly totalScanned: number
}

function getStance(vote: VoteSummary, partyAbbr: string): PartyStance | null {
  const partyVote = vote.partyVotes.find((p) => p.party === partyAbbr)
  if (!partyVote) return null
  if (partyVote.for > partyVote.against) return "for"
  if (partyVote.against > partyVote.for) return "against"
  return null
}

export async function fetchComparisonVotes(
  partyA: string,
  partyB: string,
  count = 50,
  skip = 0
): Promise<ComparisonResult> {
  const votes = await fetchVoteSummaries(count, skip)

  const disagreements = votes.flatMap((vote) => {
    const stanceA = getStance(vote, partyA)
    const stanceB = getStance(vote, partyB)
    if (stanceA && stanceB && stanceA !== stanceB) {
      return [{ vote, stanceA, stanceB } satisfies DisagreementVote]
    }
    return []
  })

  return {
    partyA,
    partyB,
    disagreements,
    totalScanned: votes.length,
  }
}
