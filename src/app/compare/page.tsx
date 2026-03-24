import { Suspense } from "react"
import Link from "next/link"
import { PARTY_MAP } from "@/lib/parties"
import { fetchComparisonVotes } from "@/lib/oda/fetch-comparison"
import { PartySelector } from "@/components/party-selector"
import { ComparisonResult } from "@/components/comparison-result"

export const dynamic = "force-dynamic"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

function parsePartyParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return null
  const upper = raw.toUpperCase()
  return PARTY_MAP[upper] ? upper : null
}

export default async function ComparePage({ searchParams }: Props) {
  const params = await searchParams
  const partyA = parsePartyParam(params.a)
  const partyB = parsePartyParam(params.b)

  const bothSelected = partyA !== null && partyB !== null && partyA !== partyB

  const result = bothSelected
    ? await fetchComparisonVotes(partyA, partyB)
    : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        ← Tilbage
      </Link>

      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-[-0.025em]">Sammenlign partier</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vælg to partier og se afstemninger, hvor de var uenige
        </p>
      </header>

      <Suspense fallback={null}>
        <PartySelector selectedA={partyA} selectedB={partyB} />
      </Suspense>

      <div className="mt-6">
        {!bothSelected && (
          <p className="text-sm text-muted-foreground">Vælg to partier ovenfor for at sammenligne.</p>
        )}
        {result && <ComparisonResult result={result} />}
      </div>
    </div>
  )
}
