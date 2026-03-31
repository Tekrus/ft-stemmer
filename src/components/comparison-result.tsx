"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { ChevronRight, ChevronDown, FileText, ExternalLink } from "lucide-react"
import type {
  ComparisonResult as ComparisonData,
  ComparedSag,
  ComparedVote,
} from "@/lib/oda/fetch-comparison"
import type { SagDocument } from "@/lib/oda/fetch-documents"
import { getPartyInfo } from "@/lib/parties"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VoteStatusBadge } from "./vote-status-badge"
import { PartyBadge } from "./party-badge"

type Props = {
  readonly result: ComparisonData
}

export function ComparisonResult({ result }: Props) {
  const [sager, setSager] = useState<readonly ComparedSag[]>(result.sager)
  const [totalScanned, setTotalScanned] = useState(result.totalScanned)
  const [loading, setLoading] = useState(false)
  const [exhausted, setExhausted] = useState(result.exhausted)

  const partyAInfo = getPartyInfo(result.partyA)
  const partyBInfo = getPartyInfo(result.partyB)

  const agreements = sager.filter((s) => s.agrees)
  const disagreements = sager.filter((s) => !s.agrees)

  const loadMore = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        a: result.partyA,
        b: result.partyB,
        skip: String(totalScanned),
      })
      const response = await fetch(`/api/compare?${params}`)
      if (!response.ok) return

      const batch: ComparisonData = await response.json()

      setSager((prev) => {
        const seenNumbers = new Set(prev.map((s) => s.sagNumber))
        const newSager = batch.sager.filter((s) => !seenNumbers.has(s.sagNumber))
        return [...prev, ...newSager]
      })
      setTotalScanned((prev) => prev + batch.totalScanned)

      if (batch.exhausted) {
        setExhausted(true)
      }
    } finally {
      setLoading(false)
    }
  }, [result.partyA, result.partyB, totalScanned])

  const loadMoreButton = !exhausted && (
    <button
      type="button"
      disabled={loading}
      onClick={loadMore}
      className="mt-6 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 disabled:opacity-50"
    >
      {loading ? "Henter flere forslag…" : "Hent flere forslag"}
    </button>
  )

  if (sager.length === 0 && exhausted) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Ingen fælles afstemninger fundet i de seneste {totalScanned} afstemninger.
        </p>
      </div>
    )
  }

  return (
    <Tabs defaultValue="all">
      <TabsList variant="line" className="w-full border-b border-border">
        <TabsTrigger value="all" className="flex-1 text-xs font-medium uppercase tracking-wide">
          Alle ({sager.length})
        </TabsTrigger>
        <TabsTrigger value="disagree" className="flex-1 text-xs font-medium uppercase tracking-wide">
          Uenige ({disagreements.length})
        </TabsTrigger>
        <TabsTrigger value="agree" className="flex-1 text-xs font-medium uppercase tracking-wide">
          Enige ({agreements.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-4">
        <SagList sager={sager} partyAInfo={partyAInfo} partyBInfo={partyBInfo} />
        {loadMoreButton}
      </TabsContent>

      <TabsContent value="disagree" className="mt-4">
        {disagreements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen uenige forslag fundet.</p>
        ) : (
          <SagList sager={disagreements} partyAInfo={partyAInfo} partyBInfo={partyBInfo} />
        )}
        {loadMoreButton}
      </TabsContent>

      <TabsContent value="agree" className="mt-4">
        {agreements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen enige forslag fundet.</p>
        ) : (
          <SagList sager={agreements} partyAInfo={partyAInfo} partyBInfo={partyBInfo} />
        )}
        {loadMoreButton}
      </TabsContent>
    </Tabs>
  )
}

type SagListProps = {
  readonly sager: readonly ComparedSag[]
  readonly partyAInfo: { abbreviation: string; color: string }
  readonly partyBInfo: { abbreviation: string; color: string }
}

function SagList({ sager, partyAInfo, partyBInfo }: SagListProps) {
  return (
    <div className="space-y-3">
      {sager.map((sag, i) => (
        <div
          key={sag.sagNumber}
          className="animate-fade-up"
          style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
        >
          <SagCard sag={sag} partyAInfo={partyAInfo} partyBInfo={partyBInfo} />
        </div>
      ))}
    </div>
  )
}

type SagCardProps = {
  readonly sag: ComparedSag
  readonly partyAInfo: { abbreviation: string; color: string }
  readonly partyBInfo: { abbreviation: string; color: string }
}

function SagCard({ sag, partyAInfo, partyBInfo }: SagCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [documents, setDocuments] = useState<SagDocument[] | null>(null)
  const [docsLoading, setDocsLoading] = useState(false)
  const primaryVote = sag.votes[0]
  const hasMultipleVotes = sag.votes.length > 1
  const hasExpandableContent = hasMultipleVotes || sag.sagId != null

  const handleExpand = useCallback(async () => {
    const willExpand = !expanded
    setExpanded(willExpand)

    if (willExpand && documents === null && sag.sagId != null) {
      setDocsLoading(true)
      try {
        const response = await fetch(`/api/sag/documents?sagId=${sag.sagId}`)
        if (response.ok) {
          setDocuments(await response.json())
        }
      } finally {
        setDocsLoading(false)
      }
    }
  }, [expanded, documents, sag.sagId])

  return (
    <article className="rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:shadow-card-hover">
      {/* Main card — links to the primary (most recent) vote */}
      <Link href={`/vote/${primaryVote.vote.id}`} className="group block p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {sag.sagNumber}
              </span>
              <VoteStatusBadge passed={primaryVote.vote.passed} />
              <span className="text-[11px] text-muted-foreground">·</span>
              <time className="text-[11px] text-muted-foreground tabular-nums font-mono">
                {new Date(primaryVote.vote.date).toLocaleDateString("da-DK", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </time>
            </div>
            <h3 className="text-[15px] font-medium leading-snug tracking-[-0.01em] line-clamp-2 group-hover:text-dannebrog transition-colors duration-200">
              {sag.shortTitle || sag.title}
            </h3>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
        </div>

        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <StanceBadge partyInfo={partyAInfo} stance={primaryVote.stanceA} />
            <span className="text-muted-foreground">vs</span>
            <StanceBadge partyInfo={partyBInfo} stance={primaryVote.stanceB} />
            {primaryVote.vote.type && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{primaryVote.vote.type}</span>
              </>
            )}
          </div>
        </div>
      </Link>

      {/* Expandable details: sub-votes + documents */}
      {hasExpandableContent && (
        <div className="border-t border-border/50">
          <button
            type="button"
            onClick={handleExpand}
            className="flex w-full items-center gap-1.5 px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground sm:px-5"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
            {hasMultipleVotes
              ? `${sag.votes.length} afstemninger og dokumenter`
              : "Dokumenter"}
          </button>

          {expanded && (
            <div className="px-4 pb-3 sm:px-5 space-y-3">
              {/* Sub-votes */}
              {hasMultipleVotes && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                    Afstemninger
                  </h4>
                  {sag.votes.map((item) => (
                    <SubVoteRow
                      key={item.vote.id}
                      item={item}
                      partyAInfo={partyAInfo}
                      partyBInfo={partyBInfo}
                    />
                  ))}
                </div>
              )}

              {/* Documents */}
              <div>
                <h4 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground mb-2">
                  Dokumenter
                </h4>
                {docsLoading && (
                  <p className="text-xs text-muted-foreground animate-pulse">
                    Henter dokumenter…
                  </p>
                )}
                {documents !== null && documents.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Ingen dokumenter fundet.
                  </p>
                )}
                {documents !== null && documents.length > 0 && (
                  <div className="space-y-1.5">
                    {documents.map((doc, i) => (
                      <DocumentRow key={i} doc={doc} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

type SubVoteRowProps = {
  readonly item: ComparedVote
  readonly partyAInfo: { abbreviation: string; color: string }
  readonly partyBInfo: { abbreviation: string; color: string }
}

function SubVoteRow({ item, partyAInfo, partyBInfo }: SubVoteRowProps) {
  const { vote, stanceA, stanceB, agrees } = item
  return (
    <Link
      href={`/vote/${vote.id}`}
      className="group/sub flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/60"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">
            {vote.type || "Afstemning"}
          </span>
          <span className={`text-[11px] font-semibold uppercase ${agrees ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {agrees ? "Enige" : "Uenige"}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <time className="tabular-nums font-mono">
            {new Date(vote.date).toLocaleDateString("da-DK", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </time>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <PartyBadge abbreviation={partyAInfo.abbreviation} color={partyAInfo.color} />
            <span className={stanceA === "for" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
              {stanceA === "for" ? "For" : "Imod"}
            </span>
          </span>
          <span>vs</span>
          <span className="inline-flex items-center gap-1">
            <PartyBadge abbreviation={partyBInfo.abbreviation} color={partyBInfo.color} />
            <span className={stanceB === "for" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
              {stanceB === "for" ? "For" : "Imod"}
            </span>
          </span>
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover/sub:translate-x-0.5" />
    </Link>
  )
}

type DocumentRowProps = {
  readonly doc: SagDocument
}

function DocumentRow({ doc }: DocumentRowProps) {
  const date = doc.date
    ? new Date(doc.date).toLocaleDateString("da-DK", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null

  if (doc.fileUrl) {
    return (
      <a
        href={doc.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group/doc flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/60"
      >
        <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium text-foreground line-clamp-2">
            {doc.title}
          </span>
          {date && (
            <span className="mt-0.5 block text-[11px] text-muted-foreground tabular-nums font-mono">
              {date}
            </span>
          )}
        </div>
        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/40 group-hover/doc:text-muted-foreground" />
      </a>
    )
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <span className="text-xs text-foreground line-clamp-2">
          {doc.title}
        </span>
        {date && (
          <span className="mt-0.5 block text-[11px] text-muted-foreground tabular-nums font-mono">
            {date}
          </span>
        )}
      </div>
    </div>
  )
}

type StanceBadgeProps = {
  readonly partyInfo: { abbreviation: string; color: string }
  readonly stance: "for" | "against"
}

function StanceBadge({ partyInfo, stance }: StanceBadgeProps) {
  const stanceColor =
    stance === "for"
      ? "text-green-700 dark:text-green-400"
      : "text-red-700 dark:text-red-400"

  return (
    <span className="inline-flex items-center gap-1.5">
      <PartyBadge abbreviation={partyInfo.abbreviation} color={partyInfo.color} />
      <span className={`font-semibold uppercase ${stanceColor}`}>
        {stance === "for" ? "For" : "Imod"}
      </span>
    </span>
  )
}
