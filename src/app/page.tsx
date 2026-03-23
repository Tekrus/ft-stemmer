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
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">FT Stemmer</h1>
          <p className="mt-1 text-muted-foreground">Seneste afstemninger i Folketinget</p>
        </div>
        <Link href="/search" className="rounded-md border border-input px-3 py-2 text-sm hover:bg-muted">
          Søg
        </Link>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Seneste afstemninger</h2>
        {votes.map((vote) => (
          <VoteCard key={vote.id} vote={vote} />
        ))}
        <LoadMoreButton initialCount={votes.length} />
      </section>

      <section className="mt-12 border-t pt-8">
        <h2 className="mb-4 text-lg font-semibold">Partier</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PARTY_MAP).map(([abbr, { name, color }]) => (
            <Link
              key={abbr}
              href={`/party/${abbr.toLowerCase()}`}
              className="rounded-md border border-input px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <PartyBadge abbreviation={abbr} color={color} />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <Link href="/search" className="text-sm text-muted-foreground hover:text-foreground underline">
          Søg i alle lovforslag →
        </Link>
      </section>
    </div>
  )
}
