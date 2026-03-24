import { Skeleton } from "@/components/ui/skeleton"

export function ComparisonSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

export default function CompareLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="mb-4 h-4 w-16" />
      <Skeleton className="mb-2 h-8 w-64" />
      <Skeleton className="mb-6 h-4 w-72" />
      <div className="space-y-4">
        <div>
          <Skeleton className="mb-1.5 h-3 w-12" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-14" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="mb-1.5 h-3 w-12" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-14" />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6">
        <ComparisonSkeleton />
      </div>
    </div>
  )
}
