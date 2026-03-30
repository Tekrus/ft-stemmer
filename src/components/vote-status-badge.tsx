type Props = {
  readonly passed: boolean
}

export function VoteStatusBadge({ passed }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium leading-none ${
        passed
          ? "bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-950/30 dark:text-green-400 dark:ring-green-800"
          : "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-800"
      }`}
    >
      {passed ? "Vedtaget" : "Forkastet"}
    </span>
  )
}
