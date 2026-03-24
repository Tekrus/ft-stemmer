import { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { fetchAfstemning, fetchSagstrin, fetchSag, fetchStemmer } from "@/lib/oda/client"
import { mapToVoteSummary } from "@/lib/oda/mapper"
import { AISummary } from "@/components/ai-summary"
import { AFSTEMNINGSTYPE_MAP } from "@/lib/oda/constants"
import { VoteStatusBadge } from "@/components/vote-status-badge"
import { VoteBar } from "@/components/vote-bar"
import { PartyTable } from "@/components/party-table"
import { Skeleton } from "@/components/ui/skeleton"
import type { OdaAfstemning } from "@/lib/oda/types"

export const revalidate = 10800

export default async function VoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const voteId = Number(id)
  if (isNaN(voteId)) notFound()

  let afstemning: OdaAfstemning
  try {
    afstemning = await fetchAfstemning(voteId)
  } catch {
    notFound()
  }

  const sagstrin = afstemning.sagstrinid
    ? await fetchSagstrin(afstemning.sagstrinid)
    : null
  const sag = sagstrin ? await fetchSag(sagstrin.sagid) : null
  const stemmerResponse = await fetchStemmer(afstemning.id)

  const vote = mapToVoteSummary(
    afstemning, sagstrin, sag, stemmerResponse.value,
    AFSTEMNINGSTYPE_MAP[afstemning.typeid] ?? "Ukendt"
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Tilbage
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm tabular-nums text-muted-foreground">{vote.number}</span>
          <VoteStatusBadge passed={vote.passed} />
        </div>
        <h1 className="mt-2 text-xl font-semibold tracking-[-0.02em] leading-snug">{vote.title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {new Date(vote.date).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })}
          {" · "}
          {vote.type}
          {vote.lawNumber && ` · Lov nr. ${vote.lawNumber}`}
        </p>
      </header>

      <div className="space-y-8">
        {sag && (
          <Suspense fallback={<Skeleton className="h-24 w-full rounded" />}>
            <AISummary
              sagId={sag.id}
              titel={vote.title}
              resume={vote.resume}
              nummer={vote.number}
              lovnummer={vote.lawNumber}
              lovnummerdato={vote.lawDate}
              vedtaget={vote.passed}
              totals={vote.totals}
            />
          </Suspense>
        )}

        {vote.resume && (
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Resume fra Folketinget</h2>
            <div className="rounded border border-border bg-card p-4">
              <p className="text-sm leading-relaxed whitespace-pre-line">{vote.resume}</p>
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Resultat</h2>
          <VoteBar
            partyVotes={vote.partyVotes}
            totalFor={vote.totals.for}
            totalAgainst={vote.totals.against}
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Partier</h2>
          <div className="rounded border border-border overflow-hidden">
            <PartyTable partyVotes={vote.partyVotes} />
          </div>
        </section>

        <section className="pb-8">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Konklusion</h2>
          <div className="rounded border border-border bg-card p-4">
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{vote.conclusion}</p>
          </div>
        </section>
      </div>
    </div>
  )
}
