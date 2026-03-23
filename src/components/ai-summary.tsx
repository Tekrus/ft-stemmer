import { getOrGenerateSummary } from "@/lib/ai/summarizer"
import type { VoteTotals } from "@/types/vote"

type Props = {
  readonly sagId: number
  readonly titel: string
  readonly resume: string
  readonly nummer: string
  readonly lovnummer: string | null
  readonly lovnummerdato: string | null
  readonly vedtaget: boolean
  readonly totals: VoteTotals
}

export async function AISummary(props: Props) {
  const summary = await getOrGenerateSummary(props)
  if (!summary) return null

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">AI Opsummering</h2>
      <div className="rounded border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
        <p className="text-sm leading-relaxed">{summary}</p>
        <p className="mt-3 text-xs text-muted-foreground">Genereret af AI — kan indeholde fejl</p>
      </div>
    </section>
  )
}
