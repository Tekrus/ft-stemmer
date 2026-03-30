import { Suspense } from "react"
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
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <section className="mb-8 animate-fade-up">
        <div className="rounded-xl bg-card p-6 shadow-card">
          <h1 className="font-heading text-xl font-semibold tracking-[-0.02em]">Sammenlign partier</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Vælg to partier og se afstemninger, hvor de var uenige
          </p>
          <div className="mt-5">
            <Suspense fallback={null}>
              <PartySelector selectedA={partyA} selectedB={partyB} />
            </Suspense>
          </div>
        </div>
      </section>

      <div>
        {!bothSelected && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">Vælg to partier ovenfor for at sammenligne.</p>
          </div>
        )}
        {result && <ComparisonResult result={result} />}
      </div>
    </div>
  )
}
