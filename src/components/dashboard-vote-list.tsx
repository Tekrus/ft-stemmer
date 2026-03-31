"use client"

import { useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VoteCard } from "./vote-card"
import { LoadMoreButton } from "./load-more-button"
import type { VoteSummary } from "@/types/vote"

type SagType = "alle" | "lovforslag" | "beslutningsforslag" | "andre"

function getSagType(number: string): "lovforslag" | "beslutningsforslag" | "andre" {
  if (number.startsWith("L")) return "lovforslag"
  if (number.startsWith("B")) return "beslutningsforslag"
  return "andre"
}

function filterByType(votes: readonly VoteSummary[], sagType: SagType): readonly VoteSummary[] {
  if (sagType === "alle") return votes
  return votes.filter((v) => getSagType(v.number) === sagType)
}

type Props = {
  readonly votes: readonly VoteSummary[]
}

export function DashboardVoteList({ votes }: Props) {
  const [sagType, setSagType] = useState<SagType>("alle")

  const vedtaget = useMemo(() => votes.filter((v) => v.passed), [votes])
  const forkastet = useMemo(() => votes.filter((v) => !v.passed), [votes])

  const typeCounts = useMemo(() => {
    const countForList = (list: readonly VoteSummary[]) => ({
      alle: list.length,
      lovforslag: list.filter((v) => getSagType(v.number) === "lovforslag").length,
      beslutningsforslag: list.filter((v) => getSagType(v.number) === "beslutningsforslag").length,
      andre: list.filter((v) => getSagType(v.number) === "andre").length,
    })
    return {
      all: countForList(votes),
      vedtaget: countForList(vedtaget),
      forkastet: countForList(forkastet),
    }
  }, [votes, vedtaget, forkastet])

  const filteredAll = useMemo(() => filterByType(votes, sagType), [votes, sagType])
  const filteredVedtaget = useMemo(() => filterByType(vedtaget, sagType), [vedtaget, sagType])
  const filteredForkastet = useMemo(() => filterByType(forkastet, sagType), [forkastet, sagType])

  return (
    <Tabs defaultValue="alle">
      <TabsList variant="line" className="w-full border-b border-border">
        <TabsTrigger value="alle" className="flex-1 text-xs font-medium uppercase tracking-wide">
          Alle ({typeCounts.all[sagType]})
        </TabsTrigger>
        <TabsTrigger value="vedtaget" className="flex-1 text-xs font-medium uppercase tracking-wide">
          Vedtaget ({typeCounts.vedtaget[sagType]})
        </TabsTrigger>
        <TabsTrigger value="forkastet" className="flex-1 text-xs font-medium uppercase tracking-wide">
          Forkastet ({typeCounts.forkastet[sagType]})
        </TabsTrigger>
      </TabsList>

      <TypeFilterBar activeSagType={sagType} onSagTypeChange={setSagType} />

      <TabsContent value="alle" className="mt-4">
        <VoteList votes={filteredAll} />
        <div className="mt-6">
          <LoadMoreButton initialCount={votes.length} />
        </div>
      </TabsContent>

      <TabsContent value="vedtaget" className="mt-4">
        {filteredVedtaget.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen vedtagne afstemninger fundet.</p>
        ) : (
          <VoteList votes={filteredVedtaget} />
        )}
        <div className="mt-6">
          <LoadMoreButton initialCount={votes.length} />
        </div>
      </TabsContent>

      <TabsContent value="forkastet" className="mt-4">
        {filteredForkastet.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen forkastede afstemninger fundet.</p>
        ) : (
          <VoteList votes={filteredForkastet} />
        )}
        <div className="mt-6">
          <LoadMoreButton initialCount={votes.length} />
        </div>
      </TabsContent>
    </Tabs>
  )
}

const TYPE_OPTIONS: readonly { readonly value: SagType; readonly label: string }[] = [
  { value: "alle", label: "Alle" },
  { value: "lovforslag", label: "Lovforslag" },
  { value: "beslutningsforslag", label: "Beslutningsforslag" },
  { value: "andre", label: "Andre" },
]

type TypeFilterBarProps = {
  readonly activeSagType: SagType
  readonly onSagTypeChange: (type: SagType) => void
}

function TypeFilterBar({ activeSagType, onSagTypeChange }: TypeFilterBarProps) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {TYPE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSagTypeChange(option.value)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            activeSagType === option.value
              ? "bg-foreground text-background"
              : "border border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

type VoteListProps = {
  readonly votes: readonly VoteSummary[]
}

function VoteList({ votes }: VoteListProps) {
  return (
    <div className="space-y-3">
      {votes.map((vote, i) => (
        <div
          key={vote.id}
          className="animate-fade-up"
          style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
        >
          <VoteCard vote={vote} />
        </div>
      ))}
    </div>
  )
}
