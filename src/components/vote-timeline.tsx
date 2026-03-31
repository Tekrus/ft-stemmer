"use client"

import { useMemo, useState } from "react"
import type { VoteSummary } from "@/types/vote"

type Props = {
  readonly votes: readonly VoteSummary[]
}

type WeekBucket = {
  readonly weekKey: string
  readonly label: string
  readonly passed: number
  readonly rejected: number
}

function getISOWeekKey(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDay()
  const thursday = new Date(date)
  thursday.setDate(date.getDate() - ((day + 6) % 7) + 3)
  const firstThursday = new Date(thursday.getFullYear(), 0, 4)
  const weekNumber = Math.round(
    ((thursday.getTime() - firstThursday.getTime()) / 86400000 +
      ((firstThursday.getDay() + 6) % 7) -
      3) /
      7 +
      1
  )
  return `${thursday.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`
}

function getMonthLabel(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("da-DK", { month: "short" })
}

function buildWeekBuckets(votes: readonly VoteSummary[], numWeeks: number): readonly WeekBucket[] {
  // Find the range: last numWeeks weeks ending at the most recent vote
  const sorted = [...votes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  if (sorted.length === 0) return []

  const latestDate = new Date(sorted[0].date)
  // Get the Monday of the latest vote's week
  const latestDay = latestDate.getDay()
  const latestMonday = new Date(latestDate)
  latestMonday.setDate(latestDate.getDate() - ((latestDay + 6) % 7))
  latestMonday.setHours(0, 0, 0, 0)

  // Build week keys for the last numWeeks weeks
  const weekKeys: string[] = []
  const weekDates: Date[] = []
  for (let i = numWeeks - 1; i >= 0; i--) {
    const monday = new Date(latestMonday)
    monday.setDate(latestMonday.getDate() - i * 7)
    weekKeys.push(getISOWeekKey(monday.toISOString()))
    weekDates.push(monday)
  }

  // Count votes per week
  const countMap = new Map<string, { passed: number; rejected: number }>()
  for (const vote of sorted) {
    const key = getISOWeekKey(vote.date)
    const existing = countMap.get(key) ?? { passed: 0, rejected: 0 }
    countMap.set(key, {
      passed: existing.passed + (vote.passed ? 1 : 0),
      rejected: existing.rejected + (vote.passed ? 0 : 1),
    })
  }

  return weekKeys.map((key, i) => {
    const counts = countMap.get(key) ?? { passed: 0, rejected: 0 }
    return {
      weekKey: key,
      label: getMonthLabel(weekDates[i].toISOString()),
      passed: counts.passed,
      rejected: counts.rejected,
    }
  })
}

export function VoteTimeline({ votes }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const weeks = useMemo(() => buildWeekBuckets(votes, 8), [votes])

  if (weeks.length === 0) return null

  const maxTotal = Math.max(...weeks.map((w) => w.passed + w.rejected), 1)

  // Determine which month labels to show (only first occurrence of each month)
  const monthLabels = weeks.map((week, i) => {
    if (i === 0) return week.label
    return week.label !== weeks[i - 1].label ? week.label : null
  })

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Aktivitet
        </span>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-green-500" />
            Vedtaget
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-red-400" />
            Forkastet
          </span>
        </div>
      </div>
      <div className="relative flex items-end gap-1" style={{ height: 48 }}>
        {weeks.map((week, i) => {
          const total = week.passed + week.rejected
          const barHeight = total === 0 ? 2 : (total / maxTotal) * 48
          const passedHeight = total === 0 ? 0 : (week.passed / total) * barHeight
          const rejectedHeight = barHeight - passedHeight

          return (
            <div
              key={week.weekKey}
              className="group relative flex flex-1 flex-col items-stretch justify-end"
              style={{ height: 48 }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {hoveredIndex === i && total > 0 && (
                <div className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-foreground/90 px-1.5 py-0.5 text-[10px] font-medium text-background">
                  {week.passed}v / {week.rejected}f
                </div>
              )}
              <div className="flex flex-col justify-end" style={{ height: 48 }}>
                {total === 0 ? (
                  <div className="w-full rounded-sm bg-muted" style={{ height: 2 }} />
                ) : (
                  <>
                    {rejectedHeight > 0 && (
                      <div
                        className="w-full rounded-t-sm bg-red-400"
                        style={{ height: rejectedHeight }}
                      />
                    )}
                    {passedHeight > 0 && (
                      <div
                        className="w-full bg-green-500"
                        style={{
                          height: passedHeight,
                          borderRadius:
                            rejectedHeight > 0 ? "0 0 2px 2px" : "2px",
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-1">
        {monthLabels.map((label, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground">
            {label ?? ""}
          </div>
        ))}
      </div>
    </div>
  )
}
