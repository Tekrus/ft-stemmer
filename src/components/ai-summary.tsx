import { Sparkles } from "lucide-react"
import { getOrGenerateSummary } from "@/lib/ai/summarizer"
import type { VoteTotals } from "@/types/vote"

type Props = {
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

export async function AISummary(props: Props) {
  const summary = await getOrGenerateSummary(props)
  if (!summary) return null

  // Split on double newline to get the two paragraphs
  const paragraphs = summary
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <section className="animate-fade-up">
      <h2 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        Kort fortalt
      </h2>
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="space-y-3">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-[15px] leading-relaxed">
              {p}
            </p>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground/60">
          Genereret af AI. Kan indeholde fejl.
        </p>
      </div>
    </section>
  )
}
