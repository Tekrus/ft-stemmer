import { fetchFromOda } from "./client"
import { STEMMETYPE, AFSTEMNINGSTYPE_MAP } from "./constants"
import type { OdaStemmetype, OdaAfstemningstype, OdaResponse } from "./types"

const EXPECTED_STEMMETYPE: Readonly<Record<number, string>> = {
  [STEMMETYPE.FOR]: "For",
  [STEMMETYPE.IMOD]: "Imod",
  [STEMMETYPE.FRAVAER]: "Fravær",
  [STEMMETYPE.HVERKEN]: "Hverken for eller imod",
}

export async function validateOdaMappings(): Promise<void> {
  try {
    const stemmetyper = await fetchFromOda<OdaResponse<OdaStemmetype>>("/Stemmetype")
    for (const st of stemmetyper.value) {
      const expected = EXPECTED_STEMMETYPE[st.id]
      if (expected && st.type !== expected) {
        console.warn(
          `[ODA] Stemmetype ID ${st.id} changed: expected "${expected}", got "${st.type}"`
        )
      }
    }

    const afstemningstyper =
      await fetchFromOda<OdaResponse<OdaAfstemningstype>>("/Afstemningstype")
    for (const at of afstemningstyper.value) {
      const expected = AFSTEMNINGSTYPE_MAP[at.id]
      if (expected && at.type !== expected) {
        console.warn(
          `[ODA] Afstemningstype ID ${at.id} changed: expected "${expected}", got "${at.type}"`
        )
      }
    }

    console.log("[ODA] Mapping validation complete")
  } catch (error) {
    console.warn("[ODA] Could not validate mappings:", error)
  }
}
