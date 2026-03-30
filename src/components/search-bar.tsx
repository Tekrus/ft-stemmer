"use client"

import { useState, useTransition, useCallback, useRef } from "react"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { searchVotes } from "@/lib/actions/search"
import type { VoteSummary } from "@/types/vote"
import { VoteCard } from "./vote-card"

type Props = {
  readonly suggestions?: readonly string[]
}

export function SearchBar({ suggestions = [] }: Props) {
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

  const showSuggestions = !hasSearched && !isPending && query.length === 0 && suggestions.length > 0

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

      {showSuggestions && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
            Prøv at søge efter
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleChange(s)}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Søger...
        </div>
      )}

      {hasSearched && !isPending && results.length === 0 && (
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
