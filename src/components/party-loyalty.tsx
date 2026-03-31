"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Loader2, User } from "lucide-react"

type LoyaltyMember = {
  readonly id: number
  readonly name: string
  readonly photoUrl: string | null
  readonly loyalty: number
  readonly totalVotes: number
  readonly deviations: number
}

type Props = {
  readonly partyAbbr: string
}

export function PartyLoyalty({ partyAbbr }: Props) {
  const [members, setMembers] = useState<readonly LoyaltyMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/party/loyalty?party=${encodeURIComponent(partyAbbr)}`
        )
        if (!response.ok) {
          throw new Error("Failed to load loyalty data")
        }
        const data = (await response.json()) as { members: LoyaltyMember[] }
        if (!cancelled) {
          setMembers(data.members)
        }
      } catch {
        if (!cancelled) {
          setError("Kunne ikke hente loyalitetsdata")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [partyAbbr])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Henter medlemmer...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center shadow-card">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center shadow-card">
        <p className="text-sm text-muted-foreground">Ingen medlemsdata tilgængelig.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <Link
          key={member.id}
          href={`/member/${member.id}`}
          className="group block"
        >
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt={member.name}
                className="h-9 w-9 rounded-full object-cover ring-1 ring-border"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted ring-1 ring-border">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium leading-snug truncate group-hover:text-dannebrog transition-colors duration-200">
                  {member.name}
                </p>
                <span className="shrink-0 font-mono text-sm tabular-nums font-semibold">
                  {member.loyalty}%
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 dark:bg-green-400 transition-all duration-500"
                    style={{ width: `${member.loyalty}%` }}
                  />
                </div>
                {member.deviations > 0 && (
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {member.deviations} afvig.
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
