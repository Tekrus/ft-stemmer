import { describe, it, expect } from "vitest"
import { extractPartyFromBiografi, mapStemmeToPartyVotes } from "@/lib/oda/mapper"
import type { OdaStemme } from "@/lib/oda/types"

describe("extractPartyFromBiografi", () => {
  it("extracts party and shortname from XML", () => {
    const bio = `<Biography><party>Socialdemokratiet</party><partyShortname>S</partyShortname></Biography>`
    const result = extractPartyFromBiografi(bio)
    expect(result).toEqual({ party: "Socialdemokratiet", partyShortname: "S" })
  })

  it("returns null for null biografi", () => {
    expect(extractPartyFromBiografi(null)).toBeNull()
  })

  it("returns null for biografi without party tags", () => {
    const bio = `<Biography><name>Test</name></Biography>`
    expect(extractPartyFromBiografi(bio)).toBeNull()
  })

  it("handles multiline biografi", () => {
    const bio = `<Biography>
      <name>Mette Frederiksen</name>
      <party>Socialdemokratiet</party>
      <partyShortname>S</partyShortname>
      <born>1977</born>
    </Biography>`
    const result = extractPartyFromBiografi(bio)
    expect(result).toEqual({ party: "Socialdemokratiet", partyShortname: "S" })
  })
})

describe("mapStemmeToPartyVotes", () => {
  const makeStemme = (typeid: number, partyShort: string, partyName: string): OdaStemme => ({
    id: 1,
    typeid,
    afstemningid: 100,
    aktørid: 1,
    opdateringsdato: "2026-01-01",
    Aktør: {
      id: 1,
      typeid: 5,
      navn: "Test",
      fornavn: "Test",
      efternavn: "Person",
      biografi: `<Biography><party>${partyName}</party><partyShortname>${partyShort}</partyShortname></Biography>`,
      opdateringsdato: "2026-01-01",
    },
  })

  it("groups votes by party and counts correctly", () => {
    const stemmer: OdaStemme[] = [
      makeStemme(1, "S", "Socialdemokratiet"),
      makeStemme(1, "S", "Socialdemokratiet"),
      makeStemme(2, "S", "Socialdemokratiet"),
      makeStemme(1, "V", "Venstre"),
      makeStemme(2, "V", "Venstre"),
    ]
    const { partyVotes, totals } = mapStemmeToPartyVotes(stemmer)

    const sVotes = partyVotes.find((p) => p.party === "S")
    expect(sVotes).toBeDefined()
    expect(sVotes!.for).toBe(2)
    expect(sVotes!.against).toBe(1)

    const vVotes = partyVotes.find((p) => p.party === "V")
    expect(vVotes).toBeDefined()
    expect(vVotes!.for).toBe(1)
    expect(vVotes!.against).toBe(1)

    expect(totals.for).toBe(3)
    expect(totals.against).toBe(2)
    expect(totals.total).toBe(5)
  })

  it("handles missing biografi with UFG fallback", () => {
    const stemmer: OdaStemme[] = [
      {
        id: 1, typeid: 1, afstemningid: 100, aktørid: 1, opdateringsdato: "2026-01-01",
        Aktør: { id: 1, typeid: 5, navn: "Unknown", fornavn: null, efternavn: null, biografi: null, opdateringsdato: "2026-01-01" },
      },
    ]
    const { partyVotes } = mapStemmeToPartyVotes(stemmer)
    expect(partyVotes[0].party).toBe("UFG")
  })
})
