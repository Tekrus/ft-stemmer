import type { OdaStemme, OdaAfstemning, OdaSag, OdaSagstrin } from "./types"
import { STEMMETYPE } from "./constants"
import type { PartyVote, VoteSummary, VoteTotals } from "@/types/vote"
import { getPartyInfo } from "@/lib/parties"

export function extractPartyFromBiografi(
  biografi: string | null
): { party: string; partyShortname: string } | null {
  if (!biografi) return null
  const partyMatch = biografi.match(/<party>([^<]+)<\/party>/)
  const shortMatch = biografi.match(/<partyShortname>([^<]+)<\/partyShortname>/)
  if (!partyMatch || !shortMatch) return null
  return { party: partyMatch[1], partyShortname: shortMatch[1] }
}

export function mapStemmeToPartyVotes(
  stemmer: readonly OdaStemme[]
): { partyVotes: PartyVote[]; totals: VoteTotals } {
  const grouped = new Map<
    string,
    { partyName: string; for: number; against: number; absent: number; abstained: number }
  >()

  for (const stemme of stemmer) {
    const extracted = extractPartyFromBiografi(stemme.Aktør?.biografi ?? null)
    const abbr = extracted?.partyShortname ?? ""
    const partyInfo = getPartyInfo(abbr)
    const key = partyInfo.abbreviation

    if (!grouped.has(key)) {
      grouped.set(key, { partyName: partyInfo.name, for: 0, against: 0, absent: 0, abstained: 0 })
    }
    const counts = grouped.get(key)!
    switch (stemme.typeid) {
      case STEMMETYPE.FOR:
        counts.for++
        break
      case STEMMETYPE.IMOD:
        counts.against++
        break
      case STEMMETYPE.FRAVAER:
        counts.absent++
        break
      case STEMMETYPE.HVERKEN:
        counts.abstained++
        break
    }
  }

  const partyVotes: PartyVote[] = Array.from(grouped.entries()).map(([abbr, counts]) => ({
    party: abbr,
    partyName: counts.partyName,
    color: getPartyInfo(abbr).color,
    for: counts.for,
    against: counts.against,
    absent: counts.absent,
    abstained: counts.abstained,
  }))

  const totals: VoteTotals = {
    for: partyVotes.reduce((sum, p) => sum + p.for, 0),
    against: partyVotes.reduce((sum, p) => sum + p.against, 0),
    absent: partyVotes.reduce((sum, p) => sum + p.absent, 0),
    abstained: partyVotes.reduce((sum, p) => sum + p.abstained, 0),
    total: stemmer.length,
  }

  return { partyVotes, totals }
}

function buildFtUrl(sag: OdaSag, periodeKode: string | null): string | null {
  if (!periodeKode || sag.nummerprefix !== "L") return null
  return `https://www.ft.dk/samling/${periodeKode}/lovforslag/l${sag.nummernumerisk}/index.htm`
}

function buildRetsinformationUrl(sag: OdaSag): string | null {
  if (!sag.lovnummer || !sag.lovnummerdato) return null
  const year = sag.lovnummerdato.slice(0, 4)
  return `https://www.retsinformation.dk/eli/lta/${year}/${sag.lovnummer}`
}

export function mapToVoteSummary(
  afstemning: OdaAfstemning,
  sagstrin: OdaSagstrin | null,
  sag: OdaSag | null,
  partyVotes: PartyVote[],
  totals: VoteTotals,
  afstemningstype: string,
  periodeKode: string | null = null
): VoteSummary {
  return {
    id: afstemning.id,
    number: sag?.nummer ?? "",
    title: sag?.titel ?? "",
    shortTitle: sag?.titelkort ?? "",
    resume: sag?.resume ?? sag?.titel ?? "",
    date: sagstrin?.dato ?? afstemning.opdateringsdato,
    passed: afstemning.vedtaget,
    conclusion: afstemning.konklusion,
    type: afstemningstype,
    lawNumber: sag?.lovnummer ?? null,
    lawDate: sag?.lovnummerdato ?? null,
    ftUrl: sag ? buildFtUrl(sag, periodeKode) : null,
    retsinformationUrl: sag ? buildRetsinformationUrl(sag) : null,
    partyVotes,
    totals,
  }
}
