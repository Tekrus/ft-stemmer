import { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ExternalLink, CheckCircle2, XCircle } from "lucide-react"
import { fetchAfstemning, fetchSagstrin, fetchSag, fetchStemmerRaw, fetchPeriode } from "@/lib/oda/client"
import { mapToVoteSummary, mapStemmeToPartyVotes } from "@/lib/oda/mapper"
import { kvGet, kvSet } from "@/lib/kv/client"
import { AISummary } from "@/components/ai-summary"
import { AFSTEMNINGSTYPE_MAP } from "@/lib/oda/constants"
import { VoteBar } from "@/components/vote-bar"
import { PartyTable } from "@/components/party-table"
import { VoteSponsors } from "@/components/vote-sponsors"
import { VoteRelated } from "@/components/vote-related"
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

  const pvKey = `partyvotes:${afstemning.id}`
  let pvCached = await kvGet<{ partyVotes: import("@/types/vote").PartyVote[]; totals: import("@/types/vote").VoteTotals }>(pvKey)
  if (!pvCached) {
    const stemmerResponse = await fetchStemmerRaw(afstemning.id)
    pvCached = mapStemmeToPartyVotes(stemmerResponse.value)
    await kvSet(pvKey, pvCached, 0)
  }

  let periodeKode: string | null = null
  if (sag) {
    try {
      const periode = await fetchPeriode(sag.periodeid)
      periodeKode = periode.kode
    } catch { /* ignore */ }
  }

  const vote = mapToVoteSummary(
    afstemning, sagstrin, sag, pvCached.partyVotes, pvCached.totals,
    AFSTEMNINGSTYPE_MAP[afstemning.typeid] ?? "Ukendt",
    periodeKode
  )

  const forPct = vote.totals.for + vote.totals.against > 0
    ? Math.round((vote.totals.for / (vote.totals.for + vote.totals.against)) * 100)
    : 0

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Alle afstemninger
      </Link>

      {/* Vote hero card */}
      <header className="animate-fade-up mb-10 rounded-xl border border-border bg-card shadow-elevated overflow-hidden">
        {/* Result banner */}
        <div className={`px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
          vote.passed
            ? "bg-green-50 border-b border-green-100 dark:bg-green-950/20 dark:border-green-900/30"
            : "bg-red-50 border-b border-red-100 dark:bg-red-950/20 dark:border-red-900/30"
        }`}>
          <div className="flex items-center gap-2">
            {vote.passed ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <span className={`text-sm font-semibold ${
              vote.passed
                ? "text-green-700 dark:text-green-400"
                : "text-red-700 dark:text-red-400"
            }`}>
              {vote.passed ? "Vedtaget" : "Forkastet"}
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-sm tabular-nums">
            <span className="text-green-700 dark:text-green-400 font-semibold">{vote.totals.for} for</span>
            <span className="text-muted-foreground">–</span>
            <span className="text-red-700 dark:text-red-400 font-semibold">{vote.totals.against} imod</span>
            <span className="text-muted-foreground text-xs">({forPct}%)</span>
          </div>
        </div>

        {/* Title and metadata */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-sm tabular-nums text-muted-foreground">{vote.number}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-[13px] text-muted-foreground">{vote.type}</span>
            {vote.lawNumber && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-[13px] text-muted-foreground">Lov nr. {vote.lawNumber}</span>
              </>
            )}
          </div>
          <h1 className="font-heading text-xl font-semibold tracking-[-0.02em] leading-snug sm:text-2xl">
            {vote.title}
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {new Date(vote.date).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          {vote.sagId && <VoteSponsors sagId={vote.sagId} />}
          {(vote.ftUrl || vote.retsinformationUrl || vote.debateUrl) && (
            <div className="mt-4 flex flex-wrap gap-3">
              {vote.ftUrl && (
                <a
                  href={vote.ftUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  ft.dk
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {vote.retsinformationUrl && (
                <a
                  href={vote.retsinformationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  retsinformation.dk
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {vote.debateUrl && (
                <a
                  href={vote.debateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  Debat
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="space-y-10">
        {/* AI Summary */}
        {sag && (
          <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
            <AISummary
              sagId={sag.id}
              titel={vote.title}
              resume={vote.resume}
              nummer={vote.number}
              lovnummer={vote.lawNumber}
              lovnummerdato={vote.lawDate}
              retsinformationUrl={vote.retsinformationUrl}
              vedtaget={vote.passed}
              totals={vote.totals}
            />
          </Suspense>
        )}

        {/* Resume */}
        {vote.resume && (
          <section className="animate-fade-up" style={{ animationDelay: "100ms" }}>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Resume fra Folketinget
            </h2>
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <p className="text-[15px] leading-relaxed whitespace-pre-line">{vote.resume}</p>
            </div>
          </section>
        )}

        {/* Vote result bar */}
        <section className="animate-fade-up" style={{ animationDelay: "150ms" }}>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
            Resultat
          </h2>
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <VoteBar
              totalFor={vote.totals.for}
              totalAgainst={vote.totals.against}
            />
          </div>
        </section>

        {/* Party table */}
        <section className="animate-fade-up" style={{ animationDelay: "200ms" }}>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
            Partier
          </h2>
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <PartyTable partyVotes={vote.partyVotes} />
          </div>
        </section>

        {/* Conclusion */}
        <section className="animate-fade-up pb-4" style={{ animationDelay: "250ms" }}>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
            Konklusion
          </h2>
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{vote.conclusion}</p>
          </div>
        </section>

        {/* Related proposals */}
        {sagstrin && sag && (
          <VoteRelated sagstrinId={sagstrin.id} sagId={sag.id} />
        )}
      </div>
    </div>
  )
}
