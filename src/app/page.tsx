import Link from "next/link"
import { fetchVoteSummaries } from "@/lib/oda/fetch-votes"
import { config } from "@/lib/config"
import { PARTY_MAP } from "@/lib/parties"
import { VoteCard } from "@/components/vote-card"
import { PartyBadge } from "@/components/party-badge"
import { LoadMoreButton } from "@/components/load-more-button"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const votes = await fetchVoteSummaries(config.pagination.defaultPageSize)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 h-0.5 w-full bg-red-600" aria-hidden="true" />
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em]">FT Stemmer</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Seneste afstemninger i Folketinget</p>
        </div>
        <Link href="/search" className="rounded border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
          Sog
        </Link>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">Seneste afstemninger</h2>
        {votes.map((vote) => (
          <VoteCard key={vote.id} vote={vote} />
        ))}
        <LoadMoreButton initialCount={votes.length} />
      </section>

      <section className="mt-10 border-t pt-6">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Partier</h2>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(PARTY_MAP).map(([abbr, { name, color }]) => (
            <Link
              key={abbr}
              href={`/party/${abbr.toLowerCase()}`}
              className="rounded border border-input px-2.5 py-1.5 text-xs hover:bg-muted transition-colors"
            >
              <PartyBadge abbreviation={abbr} color={color} />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <Link href="/search" className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
          Sog i alle lovforslag
        </Link>
      </section>
    </div>
  )
}
