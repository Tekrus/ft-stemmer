"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { PARTY_MAP } from "@/lib/parties"
import { PartyBadge } from "./party-badge"

type Props = {
  readonly selectedA: string | null
  readonly selectedB: string | null
}

const parties = Object.entries(PARTY_MAP)

export function PartySelector({ selectedA, selectedB }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParams = useCallback(
    (key: "a" | "b", value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (params.get(key) === value) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      router.replace(`/compare?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="space-y-4">
      <SelectorRow
        label="Parti A"
        selected={selectedA}
        excludedAbbr={selectedB}
        onSelect={(abbr) => updateParams("a", abbr)}
      />
      <SelectorRow
        label="Parti B"
        selected={selectedB}
        excludedAbbr={selectedA}
        onSelect={(abbr) => updateParams("b", abbr)}
      />
    </div>
  )
}

type SelectorRowProps = {
  readonly label: string
  readonly selected: string | null
  readonly excludedAbbr: string | null
  readonly onSelect: (abbr: string) => void
}

function SelectorRow({ label, selected, excludedAbbr, onSelect }: SelectorRowProps) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {parties.map(([abbr, { color }]) => {
          const isSelected = selected === abbr
          const isDisabled = excludedAbbr === abbr
          return (
            <button
              key={abbr}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect(abbr)}
              className={`rounded border px-2.5 py-1.5 text-xs transition-colors ${
                isSelected
                  ? "border-foreground/30 bg-foreground/5 ring-1 ring-foreground/20"
                  : isDisabled
                    ? "cursor-not-allowed border-input opacity-30"
                    : "border-input hover:bg-muted"
              }`}
            >
              <PartyBadge abbreviation={abbr} color={color} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
