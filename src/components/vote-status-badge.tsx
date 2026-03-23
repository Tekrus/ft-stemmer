import { Badge } from "@/components/ui/badge"

type Props = {
  readonly passed: boolean
}

export function VoteStatusBadge({ passed }: Props) {
  return (
    <Badge
      variant="outline"
      className={
        passed
          ? "rounded border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"
          : "rounded border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
      }
    >
      {passed ? "Vedtaget" : "Forkastet"}
    </Badge>
  )
}
