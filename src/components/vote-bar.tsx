type Props = {
  readonly totalFor: number
  readonly totalAgainst: number
}

export function VoteBar({ totalFor, totalAgainst }: Props) {
  const total = totalFor + totalAgainst
  if (total === 0) return null

  const forPct = Math.round((totalFor / total) * 100)

  return (
    <div className="w-full">
      <div className="flex h-8 w-full overflow-hidden rounded-lg bg-muted/50">
        <div
          className="h-full rounded-l-lg bg-green-500 transition-all duration-300"
          style={{ width: `${forPct}%` }}
        />
        <div className="h-full w-0.5 bg-background" />
        <div
          className="h-full rounded-r-lg bg-red-400 transition-all duration-300"
          style={{ width: `${100 - forPct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between font-mono text-xs tabular-nums text-muted-foreground">
        <span>
          For: <span className="font-semibold text-green-700 dark:text-green-400">{totalFor}</span> ({forPct}%)
        </span>
        <span>
          Imod: <span className="font-semibold text-red-700 dark:text-red-400">{totalAgainst}</span> ({100 - forPct}%)
        </span>
      </div>
    </div>
  )
}
