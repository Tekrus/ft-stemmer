import { fetchVoteSummaries } from "./fetch-votes"
import { kvGet, kvSet } from "@/lib/kv/client"
import { config } from "@/lib/config"
import type { VoteSummary } from "@/types/vote"

export type PartyStance = "for" | "against"

export type ComparedVote = {
  readonly vote: VoteSummary
  readonly stanceA: PartyStance
  readonly stanceB: PartyStance
  readonly agrees: boolean
}

/** A legislative case (sag) with one or more procedural votes (afstemninger) */
export type ComparedSag = {
  readonly sagId: number | null
  readonly sagNumber: string
  readonly title: string
  readonly shortTitle: string
  readonly votes: readonly ComparedVote[]
  /** Overall agreement based on the final/most recent vote */
  readonly agrees: boolean
}

export type ComparisonResult = {
  readonly partyA: string
  readonly partyB: string
  readonly sager: readonly ComparedSag[]
  readonly totalScanned: number
  readonly exhausted: boolean
}

const BATCH_SIZE = 50
const MAX_SCAN_BATCHES = 10
const MIN_RESULTS = 10

function getStance(vote: VoteSummary, partyAbbr: string): PartyStance | null {
  const partyVote = vote.partyVotes.find((p) => p.party === partyAbbr)
  if (!partyVote) return null
  if (partyVote.for > partyVote.against) return "for"
  if (partyVote.against > partyVote.for) return "against"
  return null
}

function collectComparedVotes(
  votes: readonly VoteSummary[],
  partyA: string,
  partyB: string,
  sagGroups: Map<string, ComparedVote[]>,
): void {
  for (const vote of votes) {
    const stanceA = getStance(vote, partyA)
    const stanceB = getStance(vote, partyB)
    if (!stanceA || !stanceB) continue

    const key = vote.number || String(vote.id)
    const compared: ComparedVote = { vote, stanceA, stanceB, agrees: stanceA === stanceB }

    const existing = sagGroups.get(key)
    if (existing) {
      // Only add if this afstemning id isn't already tracked
      if (!existing.some((v) => v.vote.id === vote.id)) {
        existing.push(compared)
      }
    } else {
      sagGroups.set(key, [compared])
    }
  }
}

function buildSager(sagGroups: Map<string, ComparedVote[]>): ComparedSag[] {
  return Array.from(sagGroups.entries()).map(([sagNumber, votes]) => {
    // Use the "Endelig vedtagelse" if present, otherwise the first (most recent) vote
    const finalVote =
      votes.find((v) => v.vote.type === "Endelig vedtagelse") ?? votes[0]
    const representative = votes[0].vote

    return {
      sagId: representative.sagId,
      sagNumber,
      title: representative.title,
      shortTitle: representative.shortTitle,
      votes,
      agrees: finalVote.agrees,
    }
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
  minResults = MIN_RESULTS,
  skip = 0
): Promise<ComparisonResult> {
  const cacheKey = `comparison:v3:${[partyA, partyB].sort().join(":")}:skip=${skip}:min=${minResults}`
  const cached = await kvGet<ComparisonResult>(cacheKey)
  if (cached) return cached

  const sagGroups = new Map<string, ComparedVote[]>()
  let totalScanned = 0
  let currentSkip = skip
  let exhausted = false

  for (let batch = 0; batch < MAX_SCAN_BATCHES; batch++) {
    const { votes } = await fetchVoteSummaries(BATCH_SIZE, currentSkip)

    if (votes.length === 0) {
      exhausted = true
      break
    }

    collectComparedVotes(votes, partyA, partyB, sagGroups)
    totalScanned += votes.length

    if (votes.length < BATCH_SIZE) {
      exhausted = true
      break
    }

    if (sagGroups.size >= minResults) {
      break
    }

    currentSkip += votes.length
  }

  const result: ComparisonResult = {
    partyA,
    partyB,
    sager: buildSager(sagGroups),
    totalScanned,
    exhausted,
  }

  await kvSet(cacheKey, result, config.cache.odaTtlList)
  return result
}
