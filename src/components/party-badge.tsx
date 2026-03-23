type Props = {
  readonly abbreviation: string
  readonly color: string
  readonly count?: number
}

export function PartyBadge({ abbreviation, color, count }: Props) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span
        data-party-dot
        className="inline-block h-3 w-3 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="font-medium">{abbreviation}</span>
      {count !== undefined && <span className="text-muted-foreground">{count}</span>}
    </span>
  )
}
