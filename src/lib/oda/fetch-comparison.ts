import { fetchVoteSummaries } from "./fetch-votes"
import { kvGet, kvSet } from "@/lib/kv/client"
import { config } from "@/lib/config"
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
  readonly exhausted: boolean
}

const BATCH_SIZE = 50
const MAX_SCAN_BATCHES = 10
const MIN_DISAGREEMENTS = 5

function getStance(vote: VoteSummary, partyAbbr: string): PartyStance | null {
  const partyVote = vote.partyVotes.find((p) => p.party === partyAbbr)
  if (!partyVote) return null
  if (partyVote.for > partyVote.against) return "for"
  if (partyVote.against > partyVote.for) return "against"
  return null
}

function findDisagreements(
  votes: readonly VoteSummary[],
  partyA: string,
  partyB: string
): DisagreementVote[] {
  return votes.flatMap((vote) => {
    const stanceA = getStance(vote, partyA)
    const stanceB = getStance(vote, partyB)
    if (stanceA && stanceB && stanceA !== stanceB) {
      return [{ vote, stanceA, stanceB } satisfies DisagreementVote]
    }
    return []
  })
}

/**
 * Scan batches of votes until we find at least `minDisagreements` or exhaust
 * available votes. This prevents the user from having to spam "load more"
 * when the selected parties don't appear in every vote.
 */
export async function fetchComparisonVotes(
  partyA: string,
  partyB: string,
  minDisagreements = MIN_DISAGREEMENTS,
  skip = 0
): Promise<ComparisonResult> {
  const cacheKey = `comparison:${[partyA, partyB].sort().join(":")}:skip=${skip}:min=${minDisagreements}`
  const cached = await kvGet<ComparisonResult>(cacheKey)
  if (cached) return cached

  const disagreements: DisagreementVote[] = []
  let totalScanned = 0
  let currentSkip = skip
  let exhausted = false

  for (let batch = 0; batch < MAX_SCAN_BATCHES; batch++) {
    const votes = await fetchVoteSummaries(BATCH_SIZE, currentSkip)

    if (votes.length === 0) {
      exhausted = true
      break
    }

    const found = findDisagreements(votes, partyA, partyB)
    disagreements.push(...found)
    totalScanned += votes.length

    if (votes.length < BATCH_SIZE) {
      exhausted = true
      break
    }

    if (disagreements.length >= minDisagreements) {
      break
    }

    currentSkip += votes.length
  }

  const result: ComparisonResult = {
    partyA,
    partyB,
    disagreements,
    totalScanned,
    exhausted,
  }

  await kvSet(cacheKey, result, config.cache.odaTtlList)
  return result
}
