export type VoteSummary = {
  readonly id: number
  readonly number: string
  readonly title: string
  readonly shortTitle: string
  readonly resume: string
  readonly date: string
  readonly passed: boolean
  readonly conclusion: string
  readonly type: string
  readonly lawNumber: string | null
  readonly lawDate: string | null
  readonly partyVotes: readonly PartyVote[]
  readonly totals: VoteTotals
}

export type PartyVote = {
  readonly party: string
  readonly partyName: string
  readonly color: string
  readonly for: number
  readonly against: number
  readonly absent: number
  readonly abstained: number
}

export type VoteTotals = {
  readonly for: number
  readonly against: number
  readonly absent: number
  readonly abstained: number
  readonly total: number
}

export type PartyInfo = {
  readonly abbreviation: string
  readonly name: string
  readonly color: string
}
