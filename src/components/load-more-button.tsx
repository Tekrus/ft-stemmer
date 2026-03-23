"use client"

import { useState, useTransition } from "react"
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
      {votes.map((vote) => (
        <VoteCard key={vote.id} vote={vote} />
      ))}
      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={isPending}
          className="mt-4 w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {isPending ? "Henter..." : "Vis flere"}
        </button>
      )}
    </>
  )
}
