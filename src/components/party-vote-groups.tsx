import type { PartyVote } from "@/types/vote"

type Props = {
  readonly partyVotes: readonly PartyVote[]
}

const MOBILE_CHIP_LIMIT = 5

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "")
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `${r} ${g} ${b}`
}

function PartyChip({ party, color, count, hiddenOnMobile = false }: { party: string; color: string; count: number; hiddenOnMobile?: boolean }) {
  return (
    <span
      className={`items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none ${
        hiddenOnMobile ? "hidden sm:inline-flex" : "inline-flex"
      }`}
      style={{ backgroundColor: `rgb(${hexToRgb(color)} / 0.12)` }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-foreground">{party}</span>
      <span className="font-mono tabular-nums text-muted-foreground">{count}</span>
    </span>
  )
}

function ChipRow({
  label,
  labelColor,
  parties,
  getCount,
}: {
  label: string
  labelColor: string
  parties: readonly PartyVote[]
  getCount: (p: PartyVote) => number
}) {
  if (parties.length === 0) return null
  const overflow = parties.length - MOBILE_CHIP_LIMIT

  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className={`mr-0.5 text-[11px] font-semibold uppercase tracking-wider ${labelColor}`}>
        {label}
      </span>
      {parties.map((p, i) => (
        <PartyChip
          key={p.party}
          party={p.party}
          color={p.color}
          count={getCount(p)}
          hiddenOnMobile={i >= MOBILE_CHIP_LIMIT}
        />
      ))}
      {overflow > 0 && (
        <span className="text-[11px] text-muted-foreground sm:hidden">+{overflow}</span>
      )}
    </div>
  )
}

export function PartyVoteGroups({ partyVotes }: Props) {
  const forParties = partyVotes.filter((p) => p.for > 0).sort((a, b) => b.for - a.for)
  const againstParties = partyVotes.filter((p) => p.against > 0).sort((a, b) => b.against - a.against)

  return (
    <div className="space-y-1.5">
      <ChipRow
        label="For"
        labelColor="text-green-700 dark:text-green-400"
        parties={forParties}
        getCount={(p) => p.for}
      />
      <ChipRow
        label="Imod"
        labelColor="text-red-700 dark:text-red-400"
        parties={againstParties}
        getCount={(p) => p.against}
      />
    </div>
  )
}
