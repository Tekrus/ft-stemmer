import type { PartyVote } from "@/types/vote"

type Props = {
  readonly partyVotes: readonly PartyVote[]
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "")
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `${r} ${g} ${b}`
}

function PartyChip({ party, color, count }: { party: string; color: string; count: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none"
      style={{
        backgroundColor: `rgb(${hexToRgb(color)} / 0.12)`,
        color,
      }}
    >
      {party}
      <span className="font-mono tabular-nums opacity-70">{count}</span>
    </span>
  )
}

export function PartyVoteGroups({ partyVotes }: Props) {
  const forParties = partyVotes.filter((p) => p.for > 0).sort((a, b) => b.for - a.for)
  const againstParties = partyVotes.filter((p) => p.against > 0).sort((a, b) => b.against - a.against)

  return (
    <div className="space-y-1.5">
      {forParties.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
            For
          </span>
          {forParties.map((p) => (
            <PartyChip key={p.party} party={p.party} color={p.color} count={p.for} />
          ))}
        </div>
      )}
      {againstParties.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
            Imod
          </span>
          {againstParties.map((p) => (
            <PartyChip key={p.party} party={p.party} color={p.color} count={p.against} />
          ))}
        </div>
      )}
    </div>
  )
}
