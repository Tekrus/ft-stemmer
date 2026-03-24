"use client"

import { useRouter } from "next/navigation"
import { useState, useCallback, useTransition } from "react"
import { PARTY_MAP } from "@/lib/parties"
import { PartyBadge } from "./party-badge"

type Props = {
  readonly selectedA: string | null
  readonly selectedB: string | null
}

const parties = Object.entries(PARTY_MAP)

export function PartySelector({ selectedA, selectedB }: Props) {
  const router = useRouter()
  const [localA, setLocalA] = useState(selectedA)
  const [localB, setLocalB] = useState(selectedB)
  const [, startTransition] = useTransition()

  const updateSelection = useCallback(
    (key: "a" | "b", value: string) => {
      const currentA = key === "a" ? (localA === value ? null : value) : localA
      const currentB = key === "b" ? (localB === value ? null : value) : localB

      if (key === "a") setLocalA(currentA)
      if (key === "b") setLocalB(currentB)

      const params = new URLSearchParams()
      if (currentA) params.set("a", currentA)
      if (currentB) params.set("b", currentB)

      startTransition(() => {
        router.replace(`/compare?${params.toString()}`)
      })
    },
    [router, localA, localB]
  )

  return (
    <div className="space-y-4">
      <SelectorRow
        label="Parti A"
        selected={localA}
        excludedAbbr={localB}
        onSelect={(abbr) => updateSelection("a", abbr)}
      />
      <SelectorRow
        label="Parti B"
        selected={localB}
        excludedAbbr={localA}
        onSelect={(abbr) => updateSelection("b", abbr)}
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
