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
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">AI Opsummering</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed">{summary}</p>
        <p className="mt-2 text-xs text-muted-foreground">Genereret af AI – kan indeholde fejl</p>
      </CardContent>
    </Card>
  )
}
