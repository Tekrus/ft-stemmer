export const STEMMETYPE = { FOR: 1, IMOD: 2, FRAVAER: 3, HVERKEN: 4 } as const

export const AFSTEMNINGSTYPE_MAP: Readonly<Record<number, string>> = {
  1: "Endelig vedtagelse",
  2: "Udvalgsindstilling",
  3: "Forslag til vedtagelse",
  4: "Ændringsforslag",
}
