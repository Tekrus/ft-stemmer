import { notFound } from "next/navigation"
import { PARTY_MAP, getPartyInfo } from "@/lib/parties"
import { fetchPartyVotes } from "@/lib/oda/fetch-party-votes"
import { PartyVoteList } from "@/components/party-vote-list"
import { PartyLoyalty } from "@/components/party-loyalty"

export const revalidate = 10800

export default async function PartyPage({ params }: { params: Promise<{ abbreviation: string }> }) {
  const { abbreviation } = await params
  const abbr = abbreviation.toUpperCase()

  if (!PARTY_MAP[abbr]) notFound()

  const partyInfo = getPartyInfo(abbr)
  const votes = await fetchPartyVotes(abbr)

  const passedFor = votes.passed.votedFor.length
  const passedAgainst = votes.passed.votedAgainst.length
  const rejectedFor = votes.rejected.votedFor.length
  const rejectedAgainst = votes.rejected.votedAgainst.length
  const totalVotes = passedFor + passedAgainst + rejectedFor + rejectedAgainst

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <section className="mb-8 animate-fade-up">
        <div className="rounded-xl bg-card p-6 shadow-card">
          <div className="flex items-center gap-3">
            <span
              className="inline-block h-5 w-5 rounded-full ring-2 ring-black/5"
              style={{ backgroundColor: partyInfo.color }}
            />
            <h1 className="font-heading text-xl font-semibold tracking-[-0.02em]">{partyInfo.name}</h1>
          </div>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Seneste afstemninger for {partyInfo.name}
          </p>
          {totalVotes > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg border border-border bg-secondary/50 p-3">
              <div className="text-center">
                <span className="block font-mono text-lg font-semibold tabular-nums">{totalVotes}</span>
                <span className="text-[11px] text-muted-foreground">afstemninger</span>
              </div>
              <div className="text-center">
                <span className="block font-mono text-lg font-semibold tabular-nums text-green-700 dark:text-green-400">{passedFor}</span>
                <span className="text-[11px] text-muted-foreground">stemte for vedtaget</span>
              </div>
              <div className="text-center">
                <span className="block font-mono text-lg font-semibold tabular-nums text-red-700 dark:text-red-400">{passedAgainst + rejectedFor}</span>
                <span className="text-[11px] text-muted-foreground">i mindretal</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <PartyVoteList votes={votes} partyAbbr={abbr} />

      {/* Medlemmer section — lazy-loaded */}
      <section className="mt-10 animate-fade-up" style={{ animationDelay: "200ms" }}>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Medlemmer
        </h2>
        <PartyLoyalty partyAbbr={abbr} />
      </section>
    </div>
  )
}
