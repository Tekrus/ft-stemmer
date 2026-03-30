import { notFound } from "next/navigation"
import { PARTY_MAP, getPartyInfo } from "@/lib/parties"
import { fetchPartyVotes } from "@/lib/oda/fetch-party-votes"
import { PartyVoteList } from "@/components/party-vote-list"

export const revalidate = 10800

export default async function PartyPage({ params }: { params: Promise<{ abbreviation: string }> }) {
  const { abbreviation } = await params
  const abbr = abbreviation.toUpperCase()

  if (!PARTY_MAP[abbr]) notFound()

  const partyInfo = getPartyInfo(abbr)
  const votes = await fetchPartyVotes(abbr)

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
        </div>
      </section>

      <PartyVoteList votes={votes} partyAbbr={abbr} />
    </div>
  )
}
