import { Skeleton } from "@/components/ui/skeleton"

export default function MemberLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <Skeleton className="mb-6 h-5 w-32" />

      {/* Hero card skeleton */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-elevated">
        <div className="flex items-start gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 rounded-lg border border-border bg-secondary/50 p-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Votes skeleton */}
      <Skeleton className="mb-3 h-4 w-36" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-14" />
            </div>
            <Skeleton className="h-5 w-full" />
            <Skeleton className="mt-1 h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
