"use client"

import { useState, useTransition } from "react"
import { ChevronDown, Loader2 } from "lucide-react"
import { loadMoreVotes } from "@/lib/actions/load-more"
import type { VoteSummary } from "@/types/vote"
import { VoteCard } from "./vote-card"

type Props = {
  readonly initialCount: number
}

export function LoadMoreButton({ initialCount }: Props) {
  const [votes, setVotes] = useState<VoteSummary[]>([])
  const [skip, setSkip] = useState(initialCount)
  const [hasMore, setHasMore] = useState(true)
  const [isPending, startTransition] = useTransition()

  function handleLoadMore() {
    startTransition(async () => {
      const newVotes = await loadMoreVotes(skip)
      if (newVotes.length === 0) {
        setHasMore(false)
        return
      }
      setVotes((prev) => [...prev, ...newVotes])
      setSkip((prev) => prev + newVotes.length)
    })
  }

  return (
    <>
      <div className="space-y-3">
        {votes.map((vote) => (
          <VoteCard key={vote.id} vote={vote} />
        ))}
      </div>
      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={isPending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card py-3 text-sm font-medium text-muted-foreground shadow-card transition-all duration-200 hover:shadow-card-hover hover:text-foreground hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Henter...
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Vis flere afstemninger
            </>
          )}
        </button>
      )}
    </>
  )
}
