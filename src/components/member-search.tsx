"use client"

import { useState, useCallback, useRef } from "react"
import Link from "next/link"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { MemberProfile } from "@/lib/oda/fetch-members"
import { getPartyInfo } from "@/lib/parties"
import { MemberAvatar } from "@/components/member-avatar"

export function MemberSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<readonly MemberProfile[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 2) {
      setResults([])
      setHasSearched(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/member/search?q=${encodeURIComponent(value.trim())}`
        )
        if (response.ok) {
          const data = (await response.json()) as MemberProfile[]
          setResults(data)
        } else {
          setResults([])
        }
      } catch {
        setResults([])
      } finally {
        setIsLoading(false)
        setHasSearched(true)
      }
    }, 300)
  }, [])

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Søg efter navn..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full pl-9 h-10"
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Søger...
        </div>
      )}

      {hasSearched && !isLoading && results.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-card">
          <p className="text-sm text-muted-foreground">
            Ingen medlemmer fundet for &ldquo;{query}&rdquo;
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">Prøv at justere din søgning</p>
        </div>
      )}

      <div className="space-y-2">
        {results.map((member, i) => {
          const partyInfo = getPartyInfo(member.partyShort)
          return (
            <Link
              key={member.id}
              href={`/member/${member.id}`}
              className="group block animate-fade-up"
              style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
            >
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
                <MemberAvatar src={member.photoUrl} alt={member.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug group-hover:text-dannebrog transition-colors duration-200">
                    {member.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full ring-1 ring-black/5"
                      style={{ backgroundColor: partyInfo.color }}
                    />
                    <span className="text-xs text-muted-foreground">{partyInfo.name}</span>
                    {member.constituency && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground">{member.constituency}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
