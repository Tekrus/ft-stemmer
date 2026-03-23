import type { PartyInfo } from "@/types/vote"

export const PARTY_MAP: Readonly<Record<string, { name: string; color: string }>> = {
  S:   { name: "Socialdemokratiet", color: "#a82721" },
  V:   { name: "Venstre", color: "#254264" },
  SF:  { name: "SF", color: "#e4007e" },
  EL:  { name: "Enhedslisten", color: "#e4002b" },
  M:   { name: "Moderaterne", color: "#5b2d6e" },
  DD:  { name: "Danmarksdemokraterne", color: "#00505c" },
  LA:  { name: "Liberal Alliance", color: "#13576b" },
  KF:  { name: "Det Konservative Folkeparti", color: "#00583c" },
  DF:  { name: "Dansk Folkeparti", color: "#e4ae00" },
  RV:  { name: "Radikale Venstre", color: "#733280" },
  ALT: { name: "Alternativet", color: "#2b8738" },
}

const FALLBACK_COLOR = "#6b7280"

export function getPartyInfo(abbreviation: string): PartyInfo {
  if (!abbreviation) {
    return { abbreviation: "UFG", name: "Uden for Folketingsgrupperne", color: FALLBACK_COLOR }
  }
  const entry = PARTY_MAP[abbreviation]
  if (entry) {
    return { abbreviation, name: entry.name, color: entry.color }
  }
  return { abbreviation, name: abbreviation, color: FALLBACK_COLOR }
}
