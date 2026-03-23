import { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { fetchFromOda, fetchSagstrin, fetchSag, fetchStemmer } from "@/lib/oda/client"
import { mapToVoteSummary } from "@/lib/oda/mapper"
import { AISummary } from "@/components/ai-summary"
import { AFSTEMNINGSTYPE_MAP } from "@/lib/oda/constants"
import { VoteStatusBadge } from "@/components/vote-status-badge"
import { VoteBar } from "@/components/vote-bar"
import { PartyTable } from "@/components/party-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { OdaAfstemning } from "@/lib/oda/types"

export const revalidate = 3600

export default async function VoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const voteId = Number(id)
  if (isNaN(voteId)) notFound()

  let afstemning: OdaAfstemning
  try {
    afstemning = await fetchFromOda<OdaAfstemning>(`/Afstemning(${voteId})`)
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
      <Link href="/" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        ← Tilbage
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg text-muted-foreground">{vote.number}</span>
          <VoteStatusBadge passed={vote.passed} />
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{vote.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date(vote.date).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })}
          {" · "}
          {vote.type}
          {vote.lawNumber && ` · Lov nr. ${vote.lawNumber}`}
        </p>
      </header>

      <div className="space-y-6">
        {sag && (
          <Suspense fallback={<Skeleton className="h-24 w-full" />}>
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resume fra Folketinget</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line">{vote.resume}</p>
            </CardContent>
          </Card>
        )}

        <section>
          <h2 className="mb-3 text-lg font-semibold">Resultat</h2>
          <VoteBar
            partyVotes={vote.partyVotes}
            totalFor={vote.totals.for}
            totalAgainst={vote.totals.against}
          />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Partier</h2>
          <PartyTable partyVotes={vote.partyVotes} />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Konklusion</h2>
          <p className="text-sm whitespace-pre-line text-muted-foreground">{vote.conclusion}</p>
        </section>
      </div>
    </div>
  )
}
