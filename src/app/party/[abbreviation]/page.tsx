import { notFound } from "next/navigation"
import Link from "next/link"
import { PARTY_MAP, getPartyInfo } from "@/lib/parties"
import { fetchPartyVotes } from "@/lib/oda/fetch-party-votes"
import { PartyBadge } from "@/components/party-badge"
import { PartyVoteList } from "@/components/party-vote-list"

export const revalidate = 10800

export default async function PartyPage({ params }: { params: Promise<{ abbreviation: string }> }) {
  const { abbreviation } = await params
  const abbr = abbreviation.toUpperCase()

  if (!PARTY_MAP[abbr]) notFound()

  const partyInfo = getPartyInfo(abbr)
  const votes = await fetchPartyVotes(abbr)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        ← Tilbage
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-3">
          <PartyBadge abbreviation={partyInfo.abbreviation} color={partyInfo.color} />
          <h1 className="text-xl font-semibold tracking-[-0.025em]">{partyInfo.name}</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Seneste afstemninger for {partyInfo.name}
        </p>
      </header>

      <PartyVoteList votes={votes} partyAbbr={abbr} />
    </div>
  )
}
