import { Badge } from "@/components/ui/badge"

type Props = {
  readonly passed: boolean
}

export function VoteStatusBadge({ passed }: Props) {
  return (
    <Badge variant={passed ? "default" : "destructive"} className={passed ? "bg-green-600 hover:bg-green-700" : ""}>
      {passed ? "Vedtaget" : "Forkastet"}
    </Badge>
  )
}
