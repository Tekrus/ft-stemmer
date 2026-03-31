import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function TopicLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <Skeleton className="mb-6 h-5 w-36" />

      <div className="mb-8 rounded-xl bg-card p-6 shadow-card sm:p-8">
        <Skeleton className="mb-3 h-4 w-20" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-80" />
      </div>

      <Skeleton className="mb-4 h-4 w-28" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="mt-2 h-5 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
