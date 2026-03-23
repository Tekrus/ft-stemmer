import type { PartyVote } from "@/types/vote"

type Props = {
  readonly partyVotes: readonly PartyVote[]
  readonly totalFor: number
  readonly totalAgainst: number
}

export function VoteBar({ partyVotes, totalFor, totalAgainst }: Props) {
  const total = totalFor + totalAgainst
  if (total === 0) return null

  const forParties = partyVotes.filter((p) => p.for > 0).sort((a, b) => b.for - a.for)
  const againstParties = partyVotes.filter((p) => p.against > 0).sort((a, b) => b.against - a.against)
  const forPct = Math.round((totalFor / total) * 100)

  return (
    <div className="w-full">
      <div className="flex h-6 w-full overflow-hidden rounded" style={{ gap: "2px" }}>
        {forParties.map((p) => (
          <div
            key={`for-${p.party}`}
            className="h-full transition-all"
            style={{
              width: `${(p.for / total) * 100}%`,
              backgroundColor: p.color,
            }}
            title={`${p.party}: ${p.for} for`}
          />
        ))}
        <div className="h-full w-px bg-background" />
        {againstParties.map((p) => (
          <div
            key={`against-${p.party}`}
            className="h-full opacity-50 transition-all"
            style={{
              width: `${(p.against / total) * 100}%`,
              backgroundColor: p.color,
            }}
            title={`${p.party}: ${p.against} imod`}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-xs tabular-nums text-muted-foreground">
        <span>For: {totalFor} ({forPct}%)</span>
        <span>Imod: {totalAgainst} ({100 - forPct}%)</span>
      </div>
    </div>
  )
}
