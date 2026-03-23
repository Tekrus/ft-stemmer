"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VoteCard } from "./vote-card"
import type { CategorizedVotes } from "@/lib/oda/fetch-party-votes"

type Props = {
  readonly votes: CategorizedVotes
  readonly partyAbbr: string
}

export function PartyVoteList({ votes, partyAbbr }: Props) {
  const passedTotal = votes.passed.votedFor.length + votes.passed.votedAgainst.length
  const rejectedTotal = votes.rejected.votedFor.length + votes.rejected.votedAgainst.length

  return (
    <Tabs defaultValue="passed">
      <TabsList variant="line" className="w-full border-b border-border">
        <TabsTrigger value="passed" className="flex-1 text-xs font-medium uppercase tracking-wide">
          Vedtaget ({passedTotal})
        </TabsTrigger>
        <TabsTrigger value="rejected" className="flex-1 text-xs font-medium uppercase tracking-wide">
          Forkastet ({rejectedTotal})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="passed" className="space-y-6 mt-4">
        {votes.passed.votedFor.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-green-700 dark:text-green-400">
              Stemte for ({votes.passed.votedFor.length})
            </h3>
            <div className="space-y-3">
              {votes.passed.votedFor.map((vote) => (
                <VoteCard key={vote.id} vote={vote} />
              ))}
            </div>
          </section>
        )}
        {votes.passed.votedAgainst.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-red-700 dark:text-red-400">
              Stemte imod ({votes.passed.votedAgainst.length})
            </h3>
            <div className="space-y-3">
              {votes.passed.votedAgainst.map((vote) => (
                <VoteCard key={vote.id} vote={vote} />
              ))}
            </div>
          </section>
        )}
        {passedTotal === 0 && (
          <p className="text-sm text-muted-foreground">Ingen vedtagne lovforslag fundet.</p>
        )}
      </TabsContent>

      <TabsContent value="rejected" className="space-y-6 mt-4">
        {votes.rejected.votedFor.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-green-700 dark:text-green-400">
              Stemte for ({votes.rejected.votedFor.length})
            </h3>
            <div className="space-y-3">
              {votes.rejected.votedFor.map((vote) => (
                <VoteCard key={vote.id} vote={vote} />
              ))}
            </div>
          </section>
        )}
        {votes.rejected.votedAgainst.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-red-700 dark:text-red-400">
              Stemte imod ({votes.rejected.votedAgainst.length})
            </h3>
            <div className="space-y-3">
              {votes.rejected.votedAgainst.map((vote) => (
                <VoteCard key={vote.id} vote={vote} />
              ))}
            </div>
          </section>
        )}
        {rejectedTotal === 0 && (
          <p className="text-sm text-muted-foreground">Ingen forkastede lovforslag fundet.</p>
        )}
      </TabsContent>
    </Tabs>
  )
}
