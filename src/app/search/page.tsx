import Link from "next/link"
import { SearchBar } from "@/components/search-bar"
import { fetchPopularTopics } from "@/lib/oda/fetch-topics"

export const revalidate = 10800

const SEARCH_SUGGESTIONS = [
  "folkepension",
  "klima",
  "udlændinge",
  "skat",
  "sundhed",
  "bolig",
]

export default async function SearchPage() {
  const topics = await fetchPopularTopics()

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <section className="mb-8 animate-fade-up">
        <div className="rounded-xl bg-card p-6 shadow-card">
          <h1 className="font-heading text-xl font-semibold tracking-[-0.02em]">Søg i afstemninger</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Find afstemninger om lovforslag i Folketinget
          </p>
          <div className="mt-4">
            <SearchBar suggestions={SEARCH_SUGGESTIONS} />
          </div>
        </div>
      </section>

      {topics.length > 0 && (
        <section className="animate-fade-up" style={{ animationDelay: "100ms" }}>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
            Emner
          </h2>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                href={`/topic/${topic.slug}`}
                className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5"
              >
                {topic.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
