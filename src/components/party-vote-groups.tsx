import type { PartyVote } from "@/types/vote"
import { PartyBadge } from "./party-badge"

type Props = {
  readonly partyVotes: readonly PartyVote[]
}

export function PartyVoteGroups({ partyVotes }: Props) {
  const forParties = partyVotes.filter((p) => p.for > 0).sort((a, b) => b.for - a.for)
  const againstParties = partyVotes.filter((p) => p.against > 0).sort((a, b) => b.against - a.against)

  return (
    <div className="space-y-1">
      {forParties.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-green-700 dark:text-green-400 w-10">FOR:</span>
          {forParties.map((p) => (
            <PartyBadge key={p.party} abbreviation={p.party} color={p.color} count={p.for} />
          ))}
        </div>
      )}
      {againstParties.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-red-700 dark:text-red-400 w-10">IMOD:</span>
          {againstParties.map((p) => (
            <PartyBadge key={p.party} abbreviation={p.party} color={p.color} count={p.against} />
          ))}
        </div>
      )}
    </div>
  )
}
