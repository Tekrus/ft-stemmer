import Link from "next/link"
import { Search } from "lucide-react"
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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 h-0.5 w-full bg-dannebrog" aria-hidden="true" />
      <header className="mb-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading text-[1.75rem] font-semibold tracking-[-0.03em] leading-none">
              FT Stemmer
            </h1>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Seneste afstemninger i Folketinget
            </p>
          </div>
          <nav className="flex gap-1.5">
            <Link
              href="/compare"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Sammenlign
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Search className="h-3 w-3" />
              Søg
            </Link>
          </nav>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
          Seneste afstemninger
        </h2>
        {votes.map((vote) => (
          <VoteCard key={vote.id} vote={vote} />
        ))}
        <LoadMoreButton initialCount={votes.length} />
      </section>

      <section className="mt-10 border-t border-border pt-6">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
          Partier
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(PARTY_MAP).map(([abbr, { name, color }]) => (
            <Link
              key={abbr}
              href={`/party/${abbr.toLowerCase()}`}
              className="rounded-md border border-border px-2.5 py-1.5 text-xs transition-colors hover:bg-secondary"
            >
              <PartyBadge abbreviation={abbr} color={color} />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <Link
          href="/search"
          className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Søg i alle lovforslag
        </Link>
      </section>
    </div>
  )
}
