import { config } from "@/lib/config"
import { kvGet, kvSet } from "@/lib/kv/client"
import { extractPartyFromBiografi } from "./mapper"
import { STEMMETYPE } from "./constants"
import { fetchPartyVotes as fetchPartyVotesForAfstemning } from "./fetch-votes"
import { pMap } from "@/lib/pmap"
import type { OdaResponse, OdaAktør, OdaStemme, OdaAfstemning } from "./types"

// ── Types ──────────────────────────────────────────────────────────────

export type MemberProfile = {
  readonly id: number
  readonly name: string
  readonly firstName: string
  readonly lastName: string
  readonly party: string
  readonly partyShort: string
  readonly photoUrl: string | null
  readonly constituency: string | null
}

export type MemberVoteRecord = {
  readonly voteId: number
  readonly sagNumber: string
  readonly title: string
  readonly date: string
  readonly stance: "for" | "against" | "absent" | "abstained"
  readonly passed: boolean
}

export type MemberStats = {
  readonly totalVotes: number
  readonly forCount: number
  readonly againstCount: number
  readonly absentCount: number
  readonly partyLoyalty: number
}

export type MemberSummary = {
  readonly profile: MemberProfile
  readonly stats: MemberStats
  readonly recentVotes: readonly MemberVoteRecord[]
}

// ── Biografi XML extractors ────────────────────────────────────────────

function extractPhotoUrl(biografi: string | null): string | null {
  if (!biografi) return null
  const match = biografi.match(/<pictureMiRes>([^<]+)<\/pictureMiRes>/)
  return match ? match[1] : null
}

function extractConstituency(biografi: string | null): string | null {
  if (!biografi) return null
  const match = biografi.match(/<constituency>([^<]+)<\/constituency>/)
  return match ? match[1] : null
}

// ── Raw ODA fetch (no Redis caching) ───────────────────────────────────

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

// ── Stance mapping ─────────────────────────────────────────────────────

function mapStemmetype(typeid: number): "for" | "against" | "absent" | "abstained" {
  switch (typeid) {
    case STEMMETYPE.FOR:
      return "for"
    case STEMMETYPE.IMOD:
      return "against"
    case STEMMETYPE.FRAVAER:
      return "absent"
    case STEMMETYPE.HVERKEN:
      return "abstained"
    default:
      return "absent"
  }
}

// ── Build MemberProfile from an OdaAktør ───────────────────────────────

function buildProfile(aktør: OdaAktør): MemberProfile {
  const partyInfo = extractPartyFromBiografi(aktør.biografi ?? null)
  return {
    id: aktør.id,
    name: aktør.navn,
    firstName: aktør.fornavn ?? "",
    lastName: aktør.efternavn ?? "",
    party: partyInfo?.party ?? "",
    partyShort: partyInfo?.partyShortname ?? "",
    photoUrl: extractPhotoUrl(aktør.biografi ?? null),
    constituency: extractConstituency(aktør.biografi ?? null),
  }
}

// ── Public functions ───────────────────────────────────────────────────

/**
 * Fetch a single member profile by id.
 * No caching — the page uses revalidate.
 */
export async function fetchMember(id: number): Promise<MemberProfile> {
  const aktør = await fetchOdaRaw<OdaAktør>(`/Akt%C3%B8r(${id})`)
  return buildProfile(aktør)
}

type OdaStemmeWithAfstemning = OdaStemme & {
  readonly Afstemning?: OdaAfstemning & {
    readonly Sagstrin?: {
      readonly id: number
      readonly dato: string
      readonly Sag?: {
        readonly id: number
        readonly titel: string
        readonly nummer: string
      }
    }
  }
}

/**
 * Fetch member votes and compute stats including party loyalty.
 * Cached at `mp-votes:${aktørId}` for 3h.
 */
export async function fetchMemberVotes(
  aktørId: number,
  partyShort: string,
  top = 30
): Promise<{ votes: readonly MemberVoteRecord[]; stats: MemberStats }> {
  const cacheKey = `mp-votes:${aktørId}`
  const cached = await kvGet<{ votes: readonly MemberVoteRecord[]; stats: MemberStats }>(cacheKey)
  if (cached) return cached

  // Step 1: Fetch Stemme records for this member
  const stemmer = await fetchOdaRaw<OdaResponse<OdaStemmeWithAfstemning>>(
    `/Stemme?$filter=akt%C3%B8rid eq ${aktørId}&$top=${top}&$orderby=opdateringsdato desc&$expand=Afstemning`
  )

  // Step 2: For each stemme, fetch the Afstemning details with Sagstrin/Sag expansion
  // (nested $expand may not work on ODA, so we batch-fetch separately)
  const afstemningIds = stemmer.value
    .map((s) => s.Afstemning?.id)
    .filter((id): id is number => id != null)

  const afstemningMap = new Map<number, OdaAfstemning & { Sagstrin?: { id: number; dato: string; Sag?: { id: number; titel: string; nummer: string } } }>()

  // Batch fetch afstemning details with Sagstrin/Sag
  await pMap(
    [...new Set(afstemningIds)],
    async (afsId) => {
      try {
        const afs = await fetchOdaRaw<OdaAfstemning & { Sagstrin?: { id: number; dato: string; Sag?: { id: number; titel: string; nummer: string } } }>(
          `/Afstemning(${afsId})?$expand=Sagstrin($expand=Sag)`
        )
        afstemningMap.set(afsId, afs)
      } catch {
        // If nested expand fails, try without
        try {
          const afs = await fetchOdaRaw<OdaAfstemning>(`/Afstemning(${afsId})?$expand=Sagstrin`)
          afstemningMap.set(afsId, afs as OdaAfstemning & { Sagstrin?: { id: number; dato: string; Sag?: { id: number; titel: string; nummer: string } } })
        } catch {
          // skip this vote
        }
      }
    },
    5
  )

  // Step 3: Fetch party votes for loyalty calculation
  const loyaltyResults = await pMap(
    [...new Set(afstemningIds)],
    async (afsId) => {
      try {
        const { partyVotes } = await fetchPartyVotesForAfstemning(afsId)
        return { afsId, partyVotes }
      } catch {
        return { afsId, partyVotes: [] }
      }
    },
    5
  )

  const partyVotesMap = new Map(loyaltyResults.map((r) => [r.afsId, r.partyVotes]))

  // Step 4: Build vote records and compute stats
  let forCount = 0
  let againstCount = 0
  let absentCount = 0
  let loyalVotes = 0
  let comparableVotes = 0

  const votes: MemberVoteRecord[] = stemmer.value.map((stemme) => {
    const stance = mapStemmetype(stemme.typeid)
    const afsId = stemme.afstemningid
    const afstemning = afstemningMap.get(afsId)
    const sagstrin = afstemning?.Sagstrin
    const sag = sagstrin?.Sag

    switch (stance) {
      case "for":
        forCount++
        break
      case "against":
        againstCount++
        break
      case "absent":
        absentCount++
        break
    }

    // Party loyalty: did the member vote with the party majority?
    if (stance === "for" || stance === "against") {
      const pvForVote = partyVotesMap.get(afsId) ?? []
      const partyVote = pvForVote.find((p) => p.party === partyShort)
      if (partyVote) {
        const partyMajority: "for" | "against" =
          partyVote.for >= partyVote.against ? "for" : "against"
        comparableVotes++
        if (stance === partyMajority) {
          loyalVotes++
        }
      }
    }

    return {
      voteId: afsId,
      sagNumber: sag?.nummer ?? "",
      title: sag?.titel ?? afstemning?.konklusion ?? "",
      date: sagstrin?.dato ?? afstemning?.opdateringsdato ?? stemme.opdateringsdato,
      stance,
      passed: afstemning?.vedtaget ?? false,
    }
  })

  const stats: MemberStats = {
    totalVotes: votes.length,
    forCount,
    againstCount,
    absentCount,
    partyLoyalty: comparableVotes > 0 ? Math.round((loyalVotes / comparableVotes) * 100) : 100,
  }

  const result = { votes, stats }
  await kvSet(cacheKey, result, 10800)
  return result
}

/**
 * Search for members by name.
 * OData v3 uses substringof('value', field) syntax.
 * No caching.
 */
export async function searchMembers(query: string): Promise<readonly MemberProfile[]> {
  if (!query || query.trim().length < 2) return []

  const escaped = query.trim().replace(/'/g, "''")

  // OData v3: substringof('value', field)
  const aktører = await fetchOdaRaw<OdaResponse<OdaAktør>>(
    `/Akt%C3%B8r?$filter=typeid eq 5 and substringof('${escaped}',navn)&$top=20`
  )

  return aktører.value.map(buildProfile)
}
