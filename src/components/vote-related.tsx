"use client"

import { useEffect, useState } from "react"

type RelatedSag = {
  readonly sagId: number
  readonly nummer: string
  readonly titel: string
  readonly titelkort: string
}

type Props = {
  readonly sagstrinId: number
  readonly sagId: number
}

export function VoteRelated({ sagstrinId, sagId }: Props) {
  const [related, setRelated] = useState<readonly RelatedSag[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch(
          `/api/vote/related?sagstrinId=${sagstrinId}&sagId=${sagId}`
        )
        if (!response.ok) return
        const data: RelatedSag[] = await response.json()
        if (!cancelled) {
          setRelated(data)
        }
      } catch {
        // Silently fail — related proposals are supplementary info
      } finally {
        if (!cancelled) {
          setLoaded(true)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [sagstrinId, sagId])

  if (!loaded || related.length === 0) return null

  return (
    <section className="animate-fade-up" style={{ animationDelay: "300ms" }}>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
        Relaterede forslag
      </h2>
      <div className="rounded-xl border border-border bg-card shadow-card divide-y divide-border">
        {related.map((r) => (
          <div key={r.sagId} className="px-5 py-4">
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              {r.nummer}
            </span>
            <p className="mt-1 text-[15px] leading-relaxed">
              {r.titelkort || r.titel}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
