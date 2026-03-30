import type { PartyInfo } from "@/types/vote"

export const PARTY_MAP: Readonly<Record<string, { name: string; color: string }>> = {
  S:   { name: "Socialdemokratiet", color: "#E31836" },
  V:   { name: "Venstre", color: "#003F87" },
  SF:  { name: "SF", color: "#00A651" },
  EL:  { name: "Enhedslisten", color: "#E31E24" },
  M:   { name: "Moderaterne", color: "#6C2DC7" },
  DD:  { name: "Danmarksdemokraterne", color: "#6A1B9A" },
  LA:  { name: "Liberal Alliance", color: "#00AEEF" },
  KF:  { name: "Det Konservative Folkeparti", color: "#00563F" },
  DF:  { name: "Dansk Folkeparti", color: "#FFD100" },
  RV:  { name: "Radikale Venstre", color: "#B0006D" },
  ALT: { name: "Alternativet", color: "#00A651" },
  NB:  { name: "Nye Borgerlige", color: "#00205B" },
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
