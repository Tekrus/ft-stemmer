import { Sparkles } from "lucide-react"
import { getOrGenerateSummary } from "@/lib/ai/summarizer"
import type { VoteTotals } from "@/types/vote"

function formatSummary(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br />")
}

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

  return (
    <section className="animate-fade-up">
      <h2 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        AI Opsummering
      </h2>
      <div className="rounded-xl border border-dannebrog/15 bg-gradient-to-br from-dannebrog-light/40 to-dannebrog-light/10 p-5 shadow-card">
        <div
          className="text-[15px] leading-relaxed [&_p]:mb-2.5 [&_p:last-child]:mb-0 [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{ __html: `<p>${formatSummary(summary)}</p>` }}
        />
        <p className="mt-4 text-[11px] text-muted-foreground/70">
          Genereret af AI — kan indeholde fejl
        </p>
      </div>
    </section>
  )
}
