import { describe, it, expect } from "vitest"
import { getPartyInfo, PARTY_MAP } from "@/lib/parties"

describe("getPartyInfo", () => {
  it("returns correct info for known party", () => {
    const info = getPartyInfo("S")
    expect(info).toEqual({
      abbreviation: "S",
      name: "Socialdemokratiet",
      color: "#a82721",
    })
  })

  it("returns fallback for unknown party", () => {
    const info = getPartyInfo("XYZ")
    expect(info).toEqual({
      abbreviation: "XYZ",
      name: "XYZ",
      color: "#6b7280",
    })
  })

  it("returns UFG for empty string", () => {
    const info = getPartyInfo("")
    expect(info).toEqual({
      abbreviation: "UFG",
      name: "Uden for Folketingsgrupperne",
      color: "#6b7280",
    })
  })

  it("has all major Danish parties", () => {
    const expected = ["S", "V", "SF", "EL", "M", "DD", "LA", "KF", "DF", "RV", "ALT"]
    for (const abbr of expected) {
      expect(PARTY_MAP[abbr]).toBeDefined()
    }
  })
})
