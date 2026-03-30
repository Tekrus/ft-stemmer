import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
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
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Tilbage
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-2.5">
          <PartyBadge abbreviation={partyInfo.abbreviation} color={partyInfo.color} />
          <h1 className="font-heading text-xl font-semibold tracking-[-0.02em]">{partyInfo.name}</h1>
        </div>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Seneste afstemninger for {partyInfo.name}
        </p>
      </header>

      <PartyVoteList votes={votes} partyAbbr={abbr} />
    </div>
  )
}
