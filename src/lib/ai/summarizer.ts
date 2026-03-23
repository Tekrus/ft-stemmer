import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { config } from "@/lib/config"
import { kvGet, kvSet } from "@/lib/kv/client"
import type { VoteTotals } from "@/types/vote"

type SummaryInput = {
  readonly sagId: number
  readonly titel: string
  readonly resume: string
  readonly nummer: string
  readonly lovnummer: string | null
  readonly lovnummerdato: string | null
  readonly vedtaget: boolean
  readonly totals: VoteTotals
}

type CachedSummary = {
  readonly summary: string
  readonly model: string
  readonly resumeHash: string
  readonly createdAt: string
}

function hashResume(resume: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < resume.length; i++) {
    const ch = resume.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0)
  return combined.toString(36)
}

function buildPrompt(input: SummaryInput): string {
  const lawRef = input.lovnummer
    ? `Lov nr. ${input.lovnummer} af ${input.lovnummerdato}.`
    : ""
  const outcome = input.vedtaget
    ? `Forslaget blev vedtaget med ${input.totals.for} stemmer for og ${input.totals.against} imod.`
    : `Forslaget blev forkastet med ${input.totals.for} stemmer for og ${input.totals.against} imod.`

  return `Lovforslag: ${input.nummer} — ${input.titel}

Resume: ${input.resume}

${lawRef}

${outcome}

Samlet: ${input.totals.for} for, ${input.totals.against} imod, ${input.totals.absent} fravær, ${input.totals.abstained} hverken for eller imod.`
}

export async function getOrGenerateSummary(input: SummaryInput): Promise<string | null> {
  const kvKey = `summary:${input.sagId}`
  const currentHash = hashResume(input.resume)

  const cached = await kvGet<CachedSummary>(kvKey)
  if (cached && cached.resumeHash === currentHash) {
    return cached.summary
  }

  try {
    const { text } = await generateText({
      model: google(config.ai.model),
      system: "Opsummer dette lovforslag i 2-3 sætninger på dansk i et letforståeligt sprog. Forklar hvad det betyder for borgerne. Nævn om forslaget blev vedtaget eller forkastet og med hvilken margin.",
      prompt: buildPrompt(input),
    })

    await kvSet<CachedSummary>(kvKey, {
      summary: text,
      model: config.ai.model,
      resumeHash: currentHash,
      createdAt: new Date().toISOString(),
    }, 0)

    return text
  } catch (error) {
    console.error("[AI] Summary generation failed:", error)
    return null
  }
}
