import type { PartyVote } from "@/types/vote"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PartyBadge } from "./party-badge"

type Props = {
  readonly partyVotes: readonly PartyVote[]
}

export function PartyTable({ partyVotes }: Props) {
  const sorted = [...partyVotes].sort((a, b) => b.for - a.for || a.against - b.against)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">Parti</TableHead>
          <TableHead className="text-right w-16">For</TableHead>
          <TableHead className="text-right w-16">Imod</TableHead>
          <TableHead className="text-right w-16">Fravær</TableHead>
          <TableHead className="text-right w-20">Hv. for/imod</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((p) => (
          <TableRow key={p.party}>
            <TableCell className="py-2.5">
              <div className="flex items-center gap-2">
                <PartyBadge abbreviation={p.party} color={p.color} />
                <span className="text-xs text-muted-foreground">{p.partyName}</span>
              </div>
            </TableCell>
            <TableCell className="text-right py-2.5 font-mono tabular-nums text-sm">
              {p.for > 0 ? <span className="text-green-700 dark:text-green-400 font-medium">{p.for}</span> : "—"}
            </TableCell>
            <TableCell className="text-right py-2.5 font-mono tabular-nums text-sm">
              {p.against > 0 ? <span className="text-red-700 dark:text-red-400 font-medium">{p.against}</span> : "—"}
            </TableCell>
            <TableCell className="text-right py-2.5 font-mono tabular-nums text-sm text-muted-foreground">
              {p.absent > 0 ? p.absent : "—"}
            </TableCell>
            <TableCell className="text-right py-2.5 font-mono tabular-nums text-sm text-muted-foreground">
              {p.abstained > 0 ? p.abstained : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
