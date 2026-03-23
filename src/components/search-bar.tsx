"use client"

import { useState, useTransition, useCallback, useRef } from "react"
import { Input } from "@/components/ui/input"
import { searchVotes } from "@/lib/actions/search"
import type { VoteSummary } from "@/types/vote"
import { VoteCard } from "./vote-card"

export function SearchBar() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<VoteSummary[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 2) {
      setResults([])
      setHasSearched(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const votes = await searchVotes(value)
        setResults(votes)
        setHasSearched(true)
      })
    }, 300)
  }, [])

  return (
    <div className="space-y-4">
      <Input
        type="search"
        placeholder="Søg i lovforslag..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full"
      />

      {isPending && <p className="text-sm text-muted-foreground">Søger...</p>}

      {hasSearched && !isPending && results.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Ingen resultater for &ldquo;{query}&rdquo;. Prøv at justere din søgning.
        </p>
      )}

      <div className="space-y-4">
        {results.map((vote) => (
          <VoteCard key={vote.id} vote={vote} />
        ))}
      </div>
    </div>
  )
}
