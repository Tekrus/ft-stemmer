import type { NextRequest } from "next/server"
import { PARTY_MAP } from "@/lib/parties"
import { kvGet, kvSet } from "@/lib/kv/client"
import { fetchVoteSummaries, fetchPartyVotes as fetchPartyVotesForAfstemning } from "@/lib/oda/fetch-votes"
import { config } from "@/lib/config"
import { pMap } from "@/lib/pmap"
import { STEMMETYPE } from "@/lib/oda/constants"
import { extractPartyFromBiografi } from "@/lib/oda/mapper"
import type { OdaResponse, OdaStemme } from "@/lib/oda/types"

type LoyaltyMember = {
  readonly id: number
  readonly name: string
  readonly photoUrl: string | null
  readonly loyalty: number
  readonly totalVotes: number
  readonly deviations: number
}

type LoyaltyResult = {
  readonly members: readonly LoyaltyMember[]
}

function extractPhotoUrl(biografi: string | null): string | null {
  if (!biografi) return null
  const match = biografi.match(/<pictureMiRes>([^<]+)<\/pictureMiRes>/)
  return match ? match[1] : null
}

async function fetchOdaRaw<T>(path: string): Promise<T> {
  const url = `${config.oda.baseUrl}${path}${path.includes("?") ? "&" : "?"}$format=json`
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`ODA API error: ${response.status} for ${path}`)
  }
  if (config.oda.requestDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, config.oda.requestDelayMs))
  }
  return response.json() as Promise<T>
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const party = searchParams.get("party")?.toUpperCase() ?? ""

  if (!PARTY_MAP[party]) {
    return Response.json(
      { error: "Invalid party abbreviation" },
      { status: 400 }
    )
  }

  const cacheKey = `party-loyalty:${party}`
  const cached = await kvGet<LoyaltyResult>(cacheKey)
  if (cached) return Response.json(cached)

  // Fetch the 15 most recent afstemninger
  const voteSummaries = await fetchVoteSummaries(15)
  const afstemningIds = voteSummaries.map((v) => v.id)

  // For each afstemning, fetch all Stemme records with Aktør expansion
  // and filter to the party we care about
  const mpMap = new Map<
    number,
    { name: string; photoUrl: string | null; loyalVotes: number; totalVotes: number }
  >()

  await pMap(
    afstemningIds,
    async (afsId) => {
      // Fetch the cached party breakdown to know what the party majority was
      const { partyVotes } = await fetchPartyVotesForAfstemning(afsId)
      const partyVote = partyVotes.find((p) => p.party === party)
      if (!partyVote) return

      const partyMajority: "for" | "against" =
        partyVote.for >= partyVote.against ? "for" : "against"

      // Fetch individual stemmer for this afstemning
      const stemmer = await fetchOdaRaw<OdaResponse<OdaStemme>>(
        `/Stemme?$filter=afstemningid eq ${afsId}&$expand=Akt%C3%B8r&$top=200`
      )

      for (const stemme of stemmer.value) {
        const aktør = stemme.Aktør
        if (!aktør) continue

        const extracted = extractPartyFromBiografi(aktør.biografi ?? null)
        if (extracted?.partyShortname !== party) continue

        // Only count for/imod votes for loyalty (not absent/abstained)
        if (stemme.typeid !== STEMMETYPE.FOR && stemme.typeid !== STEMMETYPE.IMOD) continue

        const stance = stemme.typeid === STEMMETYPE.FOR ? "for" : "against"
        const existing = mpMap.get(aktør.id)

        if (existing) {
          mpMap.set(aktør.id, {
            ...existing,
            totalVotes: existing.totalVotes + 1,
            loyalVotes: existing.loyalVotes + (stance === partyMajority ? 1 : 0),
          })
        } else {
          mpMap.set(aktør.id, {
            name: aktør.navn,
            photoUrl: extractPhotoUrl(aktør.biografi ?? null),
            totalVotes: 1,
            loyalVotes: stance === partyMajority ? 1 : 0,
          })
        }
      }
    },
    5
  )

  const members: LoyaltyMember[] = Array.from(mpMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      photoUrl: data.photoUrl,
      loyalty: data.totalVotes > 0 ? Math.round((data.loyalVotes / data.totalVotes) * 100) : 100,
      totalVotes: data.totalVotes,
      deviations: data.totalVotes - data.loyalVotes,
    }))
    .sort((a, b) => a.loyalty - b.loyalty) // rebels first

  const result: LoyaltyResult = { members }
  await kvSet(cacheKey, result, 10800)
  return Response.json(result)
}
