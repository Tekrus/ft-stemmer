import type { PartyVote } from "@/types/vote"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Props = {
  readonly partyVotes: readonly PartyVote[]
}

export function PartyTable({ partyVotes }: Props) {
  const active = partyVotes.filter((p) => p.for > 0 || p.against > 0 || p.abstained > 0)
  const sorted = [...active].sort((a, b) => b.for - a.for || a.against - b.against)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[180px]">Parti</TableHead>
          <TableHead className="text-right w-16">For</TableHead>
          <TableHead className="text-right w-16">Imod</TableHead>
          <TableHead className="text-right w-20 hidden sm:table-cell">Hverken</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((p) => {
          const total = p.for + p.against
          const forPct = total > 0 ? (p.for / total) * 100 : 0
          return (
            <TableRow key={p.party} className="group">
              <TableCell className="py-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="inline-block h-3 w-3 rounded-full ring-1 ring-black/5 shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <div className="min-w-0">
                    <span className="block text-sm font-medium">{p.party}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{p.partyName}</span>
                  </div>
                </div>
                {total > 0 && (
                  <div className="mt-1.5 ml-[22px] flex h-1.5 w-24 overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${forPct}%`, backgroundColor: p.color }}
                    />
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right py-3 font-mono tabular-nums text-sm">
                {p.for > 0 ? <span className="text-green-700 dark:text-green-400 font-semibold">{p.for}</span> : <span className="text-muted-foreground/40">—</span>}
              </TableCell>
              <TableCell className="text-right py-3 font-mono tabular-nums text-sm">
                {p.against > 0 ? <span className="text-red-700 dark:text-red-400 font-semibold">{p.against}</span> : <span className="text-muted-foreground/40">—</span>}
              </TableCell>
              <TableCell className="text-right py-3 font-mono tabular-nums text-sm text-muted-foreground hidden sm:table-cell">
                {p.abstained > 0 ? p.abstained : <span className="text-muted-foreground/40">—</span>}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
