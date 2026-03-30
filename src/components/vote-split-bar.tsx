import type { PartyVote } from "@/types/vote"

type Props = {
  readonly totalFor: number
  readonly totalAgainst: number
  readonly partyVotes: readonly PartyVote[]
}

export function VoteSplitBar({ totalFor, totalAgainst, partyVotes }: Props) {
  const total = totalFor + totalAgainst
  if (total === 0) return null

  const forPct = Math.round((totalFor / total) * 100)
  const forParties = partyVotes.filter((p) => p.for > 0).sort((a, b) => b.for - a.for)
  const againstParties = partyVotes.filter((p) => p.against > 0).sort((a, b) => b.against - a.against)

  return (
    <div className="w-full">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/50" style={{ gap: "1.5px" }}>
        {forParties.map((p) => (
          <div
            key={`for-${p.party}`}
            className="h-full transition-all duration-300"
            style={{
              width: `${(p.for / total) * 100}%`,
              backgroundColor: p.color,
            }}
          />
        ))}
        <div className="h-full w-0.5 bg-background" />
        {againstParties.map((p) => (
          <div
            key={`against-${p.party}`}
            className="h-full opacity-35 transition-all duration-300"
            style={{
              width: `${(p.against / total) * 100}%`,
              backgroundColor: p.color,
            }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{totalFor}</span> for ({forPct}%)
        </span>
        <span>
          <span className="font-semibold text-foreground">{totalAgainst}</span> imod ({100 - forPct}%)
        </span>
      </div>
    </div>
  )
}
