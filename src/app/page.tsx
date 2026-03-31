import Link from "next/link"
import { fetchVoteSummaries, fetchVoteCountByStatus } from "@/lib/oda/fetch-votes"
import { fetchFromOda } from "@/lib/oda/client"
import { config } from "@/lib/config"
import { PARTY_MAP } from "@/lib/parties"
import { PartyBadge } from "@/components/party-badge"
import { DashboardVoteList } from "@/components/dashboard-vote-list"
import type { OdaResponse, OdaPeriode } from "@/lib/oda/types"

export const revalidate = 10800

async function getCurrentPeriodeName(): Promise<string | null> {
  try {
    const response = await fetchFromOda<OdaResponse<OdaPeriode>>(
      "/Periode?$top=1&$orderby=startdato desc"
    )
    const periode = response.value[0]
    return periode?.titel ?? null
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const [{ votes }, periodeName, statusCounts] = await Promise.all([
    fetchVoteSummaries(config.pagination.defaultPageSize),
    getCurrentPeriodeName(),
    fetchVoteCountByStatus(),
  ])

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      {/* Hero */}
      <section className="mb-12 animate-fade-up">
        <div className="relative overflow-hidden rounded-xl bg-card p-6 shadow-card sm:p-8">
          {/* Subtle decorative accent */}
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-[0.06]"
            style={{ background: "radial-gradient(circle, var(--color-dannebrog) 0%, transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute -right-2 -top-2 h-16 w-16 rounded-full opacity-[0.04]"
            style={{ background: "radial-gradient(circle, var(--color-dannebrog) 0%, transparent 70%)" }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1 w-8 rounded-full bg-dannebrog" />
              <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                Folketinget
              </span>
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              Seneste afstemninger
            </h1>
            {periodeName && (
              <span className="mt-2 inline-block rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {periodeName}
              </span>
            )}
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Hvad stemmer Folketinget om? Se de nyeste afstemninger her.
            </p>
          </div>
        </div>
      </section>

      {/* Vote list */}
      <section>
        <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Afstemninger
        </h2>
        <DashboardVoteList votes={votes} statusCounts={statusCounts} />
      </section>

      {/* Parties */}
      <section className="mt-14">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Partier i Folketinget
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(PARTY_MAP).map(([abbr, { name, color }]) => (
            <Link
              key={abbr}
              href={`/party/${abbr.toLowerCase()}`}
              className="group flex items-center gap-2.5 rounded-lg border border-border bg-card p-3 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5"
            >
              <span
                className="inline-block h-3 w-3 rounded-full ring-1 ring-black/5"
                style={{ backgroundColor: color }}
              />
              <div className="min-w-0">
                <span className="block text-sm font-medium truncate">{name}</span>
                <span className="block text-xs text-muted-foreground">{abbr}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
