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
  readonly retsinformationUrl: string | null
  readonly vedtaget: boolean
  readonly totals: VoteTotals
}

type CachedSummary = {
  readonly summary: string
  readonly model: string
  readonly resumeHash: string
  readonly createdAt: string
}

// Ordered by preference: cheapest/highest-limit first
const MODEL_FALLBACK_CHAIN = [
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3-flash",
] as const

const SYSTEM_PROMPT =
  "Opsummer dette lovforslag i 2-3 sætninger på dansk i et letforståeligt sprog. Forklar hvad det betyder for borgerne. Nævn om forslaget blev vedtaget eller forkastet og med hvilken margin. Hvis den fulde lovtekst er inkluderet, brug den som primær kilde."

const MAX_LAW_TEXT_CHARS = 8000

async function fetchLawText(retsinformationUrl: string): Promise<string | null> {
  const xmlUrl = `${retsinformationUrl}/xml`
  try {
    const response = await fetch(xmlUrl, { next: { revalidate: 0 } })
    if (!response.ok) return null
    const xml = await response.text()
    const chars = xml.match(/<Char[^>]*>([^<]+)<\/Char>/g)
    if (!chars) return null
    const text = chars
      .map((tag) => tag.replace(/<Char[^>]*>([^<]+)<\/Char>/, "$1"))
      .join("\n")
    return text.slice(0, MAX_LAW_TEXT_CHARS)
  } catch {
    return null
  }
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

function buildPrompt(input: SummaryInput, lawText: string | null): string {
  const lawRef = input.lovnummer
    ? `Lov nr. ${input.lovnummer} af ${input.lovnummerdato}.`
    : ""
  const outcome = input.vedtaget
    ? `Forslaget blev vedtaget med ${input.totals.for} stemmer for og ${input.totals.against} imod.`
    : `Forslaget blev forkastet med ${input.totals.for} stemmer for og ${input.totals.against} imod.`

  const lawSection = lawText
    ? `\n\nFulde lovtekst fra retsinformation.dk:\n${lawText}`
    : ""

  return `Lovforslag: ${input.nummer} — ${input.titel}

Resume: ${input.resume}

${lawRef}

${outcome}

Samlet: ${input.totals.for} for, ${input.totals.against} imod, ${input.totals.absent} fravær, ${input.totals.abstained} hverken for eller imod.${lawSection}`
}

async function generateWithFallback(prompt: string): Promise<{ text: string; model: string }> {
  const errors: string[] = []
  const models = config.ai.modelOverride
    ? [config.ai.modelOverride]
    : MODEL_FALLBACK_CHAIN

  for (const modelId of models) {
    try {
      const { text } = await generateText({
        model: google(modelId),
        system: SYSTEM_PROMPT,
        prompt,
      })
      return { text, model: modelId }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.warn(`[AI] Model ${modelId} failed: ${msg.slice(0, 100)}`)
      errors.push(`${modelId}: ${msg.slice(0, 80)}`)
    }
  }

  throw new Error(`All models failed:\n${errors.join("\n")}`)
}

export async function getOrGenerateSummary(input: SummaryInput): Promise<string | null> {
  const kvKey = `summary:${input.sagId}`
  const currentHash = hashResume(input.resume)

  const cached = await kvGet<CachedSummary>(kvKey)
  if (cached && cached.resumeHash === currentHash) {
    return cached.summary
  }

  try {
    const lawText = input.retsinformationUrl
      ? await fetchLawText(input.retsinformationUrl)
      : null
    const { text, model } = await generateWithFallback(buildPrompt(input, lawText))

    await kvSet<CachedSummary>(kvKey, {
      summary: text,
      model,
      resumeHash: currentHash,
      createdAt: new Date().toISOString(),
    }, 0)

    return text
  } catch (error) {
    console.error("[AI] Summary generation failed:", error)
    return null
  }
}
