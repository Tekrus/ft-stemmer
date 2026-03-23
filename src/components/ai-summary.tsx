import { getOrGenerateSummary } from "@/lib/ai/summarizer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    <Card className="border-l-2 border-l-blue-400 bg-transparent dark:border-l-blue-500">
      <CardHeader className="px-4 py-3 pb-1">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI Opsummering</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <p className="text-sm leading-relaxed">{summary}</p>
        <p className="mt-2 text-xs text-muted-foreground">Genereret af AI &mdash; kan indeholde fejl</p>
      </CardContent>
    </Card>
  )
}
