import Link from "next/link"
import type { VoteSummary } from "@/types/vote"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VoteStatusBadge } from "./vote-status-badge"
import { PartyVoteGroups } from "./party-vote-groups"

type Props = {
  readonly vote: VoteSummary
}

export function VoteCard({ vote }: Props) {
  return (
    <Link href={`/vote/${vote.id}`}>
      <Card className="transition-colors hover:bg-muted/30">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{vote.number}</span>
              <VoteStatusBadge passed={vote.passed} />
            </div>
            <time className="text-xs text-muted-foreground tabular-nums">
              {new Date(vote.date).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
            </time>
          </div>
          <CardTitle className="text-sm font-medium leading-snug">{vote.shortTitle || vote.title}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <PartyVoteGroups partyVotes={vote.partyVotes} />
        </CardContent>
      </Card>
    </Link>
  )
}
