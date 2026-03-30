type Props = {
  readonly totalFor: number
  readonly totalAgainst: number
}

export function VoteSplitBar({ totalFor, totalAgainst }: Props) {
  const total = totalFor + totalAgainst
  if (total === 0) return null

  const forPct = Math.round((totalFor / total) * 100)

  return (
    <div className="w-full">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-l-full bg-green-500 transition-all duration-300"
          style={{ width: `${forPct}%` }}
        />
        <div className="h-full w-0.5 bg-background" />
        <div
          className="h-full rounded-r-full bg-red-400 transition-all duration-300"
          style={{ width: `${100 - forPct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
        <span>
          <span className="font-semibold text-green-700 dark:text-green-400">{totalFor}</span> for ({forPct}%)
        </span>
        <span>
          <span className="font-semibold text-red-700 dark:text-red-400">{totalAgainst}</span> imod ({100 - forPct}%)
        </span>
      </div>
    </div>
  )
}
