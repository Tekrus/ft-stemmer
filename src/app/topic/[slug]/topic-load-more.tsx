"use client"

import { useState, useCallback } from "react"
import { VoteCard } from "@/components/vote-card"
import type { VoteSummary } from "@/types/vote"

type Props = {
  readonly emneordId: number
  readonly initialSkip: number
}

export function TopicLoadMore({ emneordId, initialSkip }: Props) {
  const [votes, setVotes] = useState<readonly VoteSummary[]>([])
  const [skip, setSkip] = useState(initialSkip)
  const [exhausted, setExhausted] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadMore = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/topic/more?id=${emneordId}&skip=${skip}`)
      if (!res.ok) return
      const data = (await res.json()) as { votes: VoteSummary[]; exhausted: boolean }
      setVotes((prev) => [...prev, ...data.votes])
      setSkip((prev) => prev + data.votes.length)
      setExhausted(data.exhausted)
    } finally {
      setLoading(false)
    }
  }, [emneordId, skip])

  return (
    <>
      {votes.length > 0 && (
        <div className="mt-4 space-y-4">
          {votes.map((vote) => (
            <VoteCard key={vote.id} vote={vote} />
          ))}
        </div>
      )}
      {!exhausted && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? "Indlaeser..." : "Vis flere"}
          </button>
        </div>
      )}
    </>
  )
}
