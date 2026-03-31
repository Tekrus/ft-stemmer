"use client"

import type { ReactNode } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Props = {
  readonly voteSearch: ReactNode
  readonly memberSearch: ReactNode
}

export function SearchTabs({ voteSearch, memberSearch }: Props) {
  return (
    <Tabs defaultValue="votes">
      <TabsList variant="line" className="w-full border-b border-border mb-4">
        <TabsTrigger value="votes" className="flex-1 text-xs font-medium uppercase tracking-wide">
          Afstemninger
        </TabsTrigger>
        <TabsTrigger value="members" className="flex-1 text-xs font-medium uppercase tracking-wide">
          Medlemmer
        </TabsTrigger>
      </TabsList>

      <TabsContent value="votes">
        {voteSearch}
      </TabsContent>

      <TabsContent value="members">
        {memberSearch}
      </TabsContent>
    </Tabs>
  )
}
