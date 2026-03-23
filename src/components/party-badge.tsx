type Props = {
  readonly abbreviation: string
  readonly color: string
  readonly count?: number
}

export function PartyBadge({ abbreviation, color, count }: Props) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span
        data-party-dot
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="font-medium">{abbreviation}</span>
      {count !== undefined && <span className="font-mono tabular-nums text-muted-foreground">{count}</span>}
    </span>
  )
}
