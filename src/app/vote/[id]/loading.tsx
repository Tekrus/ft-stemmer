import { Skeleton } from "@/components/ui/skeleton"

export default function VoteDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="mb-4 h-4 w-16" />
      <Skeleton className="mb-2 h-6 w-32" />
      <Skeleton className="mb-1 h-8 w-full" />
      <Skeleton className="mb-8 h-4 w-48" />
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}
