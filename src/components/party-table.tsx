import type { PartyVote } from "@/types/vote"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PartyBadge } from "./party-badge"

type Props = {
  readonly partyVotes: readonly PartyVote[]
}

export function PartyTable({ partyVotes }: Props) {
  const forParties = partyVotes.filter((p) => p.for > 0).sort((a, b) => b.for - a.for)
  const againstParties = partyVotes.filter((p) => p.against > 0).sort((a, b) => b.against - a.against)
  const sorted = [...forParties, ...againstParties.filter((p) => !forParties.includes(p))]

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Parti</TableHead>
          <TableHead className="text-right">For</TableHead>
          <TableHead className="text-right">Imod</TableHead>
          <TableHead className="text-right">Frav&aelig;r</TableHead>
          <TableHead className="text-right">Hv. for/imod</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((p) => {
          const isFor = p.for > p.against
          const bgClass = isFor ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"
          return (
            <TableRow key={p.party} className={bgClass}>
              <TableCell>
                <PartyBadge abbreviation={p.party} color={p.color} />
                <span className="ml-2 text-sm text-muted-foreground">{p.partyName}</span>
              </TableCell>
              <TableCell className="text-right font-medium">{p.for || "\u2014"}</TableCell>
              <TableCell className="text-right font-medium">{p.against || "\u2014"}</TableCell>
              <TableCell className="text-right">{p.absent || "\u2014"}</TableCell>
              <TableCell className="text-right">{p.abstained || "\u2014"}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
