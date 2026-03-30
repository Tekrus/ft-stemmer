import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { VoteSummary } from "@/types/vote"
import { VoteStatusBadge } from "./vote-status-badge"
import { VoteSplitBar } from "./vote-split-bar"
import { PartyVoteGroups } from "./party-vote-groups"

type Props = {
  readonly vote: VoteSummary
}

export function VoteCard({ vote }: Props) {
  return (
    <Link href={`/vote/${vote.id}`} className="group block">
      <article className="rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 sm:p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{vote.number}</span>
              <VoteStatusBadge passed={vote.passed} />
              <span className="text-[11px] text-muted-foreground">·</span>
              <time className="text-[11px] text-muted-foreground tabular-nums font-mono">
                {new Date(vote.date).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
              </time>
            </div>
            <h3 className="text-[15px] font-medium leading-snug tracking-[-0.01em] line-clamp-2 group-hover:text-dannebrog transition-colors duration-200">
              {vote.shortTitle || vote.title}
            </h3>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
        </div>

        {/* Vote visualization */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <VoteSplitBar
            totalFor={vote.totals.for}
            totalAgainst={vote.totals.against}
            partyVotes={vote.partyVotes}
          />
        </div>

        {/* Party breakdown */}
        <div className="mt-3">
          <PartyVoteGroups partyVotes={vote.partyVotes} />
        </div>
      </article>
    </Link>
  )
}
