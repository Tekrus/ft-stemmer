import { Skeleton } from "@/components/ui/skeleton"

export default function PartyLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="mb-4 h-4 w-16" />
      <Skeleton className="mb-2 h-8 w-64" />
      <Skeleton className="mb-8 h-4 w-48" />
      <Skeleton className="mb-4 h-10 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}
