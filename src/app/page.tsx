import Link from "next/link"
import { fetchVoteSummaries } from "@/lib/oda/fetch-votes"
import { config } from "@/lib/config"
import { PARTY_MAP } from "@/lib/parties"
import { VoteCard } from "@/components/vote-card"
import { PartyBadge } from "@/components/party-badge"
import { LoadMoreButton } from "@/components/load-more-button"

export const revalidate = 10800

export default async function DashboardPage() {
  const votes = await fetchVoteSummaries(config.pagination.defaultPageSize)

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      {/* Hero */}
      <section className="mb-12 animate-fade-up">
        <div className="rounded-xl bg-card p-6 shadow-card sm:p-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-1 w-8 rounded-full bg-dannebrog" />
            <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Folketinget
            </span>
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
            Seneste afstemninger
          </h1>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Følg med i hvad Folketinget stemmer om — fra lovforslag til beslutningsforslag.
          </p>
        </div>
      </section>

      {/* Vote list */}
      <section>
        <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Afstemninger
        </h2>
        <div className="space-y-3">
          {votes.map((vote, i) => (
            <div
              key={vote.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
            >
              <VoteCard vote={vote} />
            </div>
          ))}
        </div>
        <div className="mt-6">
          <LoadMoreButton initialCount={votes.length} />
        </div>
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
