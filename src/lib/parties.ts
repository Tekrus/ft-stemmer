import type { PartyInfo } from "@/types/vote"

export const PARTY_MAP: Readonly<Record<string, { name: string; color: string }>> = {
  S:   { name: "Socialdemokratiet", color: "#A82720" },
  V:   { name: "Venstre", color: "#264264" },
  SF:  { name: "SF", color: "#E07EA7" },
  EL:  { name: "Enhedslisten", color: "#E5801B" },
  M:   { name: "Moderaterne", color: "#B48BD2" },
  DD:  { name: "Danmarksdemokraterne", color: "#7896D2" },
  LA:  { name: "Liberal Alliance", color: "#3EB2BE" },
  KF:  { name: "Det Konservative Folkeparti", color: "#95B226" },
  DF:  { name: "Dansk Folkeparti", color: "#EAC73E" },
  RV:  { name: "Radikale Venstre", color: "#733280" },
  ALT: { name: "Alternativet", color: "#2B8738" },
  NB:  { name: "Nye Borgerlige", color: "#00434f" },
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
