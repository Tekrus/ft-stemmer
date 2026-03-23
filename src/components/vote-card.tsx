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
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{vote.number}</span>
              <VoteStatusBadge passed={vote.passed} />
            </div>
            <time className="text-sm text-muted-foreground">
              {new Date(vote.date).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
            </time>
          </div>
          <CardTitle className="text-base leading-snug">{vote.shortTitle || vote.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <PartyVoteGroups partyVotes={vote.partyVotes} />
        </CardContent>
      </Card>
    </Link>
  )
}
