import Link from "next/link"
import type { ComparisonResult as ComparisonData } from "@/lib/oda/fetch-comparison"
import { getPartyInfo } from "@/lib/parties"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VoteStatusBadge } from "./vote-status-badge"
import { PartyBadge } from "./party-badge"

type Props = {
  readonly result: ComparisonData
}

export function ComparisonResult({ result }: Props) {
  const partyAInfo = getPartyInfo(result.partyA)
  const partyBInfo = getPartyInfo(result.partyB)
  const { disagreements, totalScanned } = result

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Uenige i{" "}
        <span className="font-semibold text-foreground">{disagreements.length}</span>{" "}
        af {totalScanned} afstemninger
      </p>

      {disagreements.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ingen uenigheder fundet i de seneste {totalScanned} afstemninger.
        </p>
      ) : (
        <div className="space-y-3">
          {disagreements.map(({ vote, stanceA, stanceB }) => (
            <Link key={vote.id} href={`/vote/${vote.id}`}>
              <Card className="transition-colors hover:bg-muted/30">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {vote.number}
                      </span>
                      <VoteStatusBadge passed={vote.passed} />
                    </div>
                    <time className="text-xs text-muted-foreground tabular-nums">
                      {new Date(vote.date).toLocaleDateString("da-DK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                  <CardTitle className="text-sm font-medium leading-snug">
                    {vote.shortTitle || vote.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <StanceBadge
                      partyInfo={partyAInfo}
                      stance={stanceA}
                    />
                    <span className="text-muted-foreground">vs</span>
                    <StanceBadge
                      partyInfo={partyBInfo}
                      stance={stanceB}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

type StanceBadgeProps = {
  readonly partyInfo: { abbreviation: string; color: string }
  readonly stance: "for" | "against"
}

function StanceBadge({ partyInfo, stance }: StanceBadgeProps) {
  const stanceColor =
    stance === "for"
      ? "text-green-700 dark:text-green-400"
      : "text-red-700 dark:text-red-400"

  return (
    <span className="inline-flex items-center gap-1.5">
      <PartyBadge abbreviation={partyInfo.abbreviation} color={partyInfo.color} />
      <span className={`font-semibold uppercase ${stanceColor}`}>
        {stance === "for" ? "For" : "Imod"}
      </span>
    </span>
  )
}
