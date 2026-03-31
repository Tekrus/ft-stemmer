"use client"

import { useState, useTransition, useCallback, useRef } from "react"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { searchVotes } from "@/lib/actions/search"
import type { VoteSummary } from "@/types/vote"
import { VoteCard } from "./vote-card"

export function SearchBar() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<VoteSummary[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loading = isSearching || isPending

  const handleChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 2) {
      setResults([])
      setHasSearched(false)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const votes = await searchVotes(value)
        setResults(votes)
        setHasSearched(true)
        setIsSearching(false)
      })
    }, 300)
  }, [])

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Søg i lovforslag..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full pl-9 h-10"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Søger...
        </div>
      )}

      {hasSearched && !loading && results.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-card">
          <p className="text-sm text-muted-foreground">
            Ingen resultater for &ldquo;{query}&rdquo;
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">Prøv at justere din søgning</p>
        </div>
      )}

      <div className="space-y-3">
        {results.map((vote, i) => (
          <div
            key={vote.id}
            className="animate-fade-up"
            style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
          >
            <VoteCard vote={vote} />
          </div>
        ))}
      </div>
    </div>
  )
}
