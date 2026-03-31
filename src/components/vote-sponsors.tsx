"use client"

import { useEffect, useState } from "react"

type SagSponsor = {
  readonly name: string
  readonly role: string
  readonly aktørId: number
}

type Props = {
  readonly sagId: number
}

export function VoteSponsors({ sagId }: Props) {
  const [sponsors, setSponsors] = useState<readonly SagSponsor[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch(`/api/vote/sponsors?sagId=${sagId}`)
        if (!response.ok) return
        const data: SagSponsor[] = await response.json()
        if (!cancelled) {
          setSponsors(data)
        }
      } catch {
        // Silently fail — sponsors are supplementary info
      } finally {
        if (!cancelled) {
          setLoaded(true)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [sagId])

  if (!loaded || sponsors.length === 0) return null

  return (
    <p className="mt-2 text-[13px] text-muted-foreground">
      Fremsat af:{" "}
      {sponsors.map((s, i) => (
        <span key={s.aktørId}>
          {i > 0 && ", "}
          {s.name} ({s.role})
        </span>
      ))}
    </p>
  )
}
