import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { fetchEmneordBySlug, fetchTopicVotes } from "@/lib/oda/fetch-topics"
import { config } from "@/lib/config"
import { VoteCard } from "@/components/vote-card"
import { TopicLoadMore } from "./topic-load-more"

export const revalidate = 10800

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const decodedSlug = decodeURIComponent(slug)

  const emneord = await fetchEmneordBySlug(decodedSlug)
  if (!emneord) notFound()

  const pageSize = config.pagination.defaultPageSize
  const { votes, exhausted } = await fetchTopicVotes(emneord.id, pageSize, 0)

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <Link
        href="/search"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Tilbage til emner
      </Link>

      <section className="mb-8 animate-fade-up">
        <div className="relative overflow-hidden rounded-xl bg-card p-6 shadow-card sm:p-8">
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1 w-8 rounded-full bg-dannebrog" />
              <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                Emne
              </span>
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              {emneord.emneord}
            </h1>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Afstemninger relateret til dette emne i Folketinget.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Afstemninger
        </h2>
        <div className="space-y-4">
          {votes.map((vote) => (
            <VoteCard key={vote.id} vote={vote} />
          ))}
        </div>
        {votes.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 text-center shadow-card">
            <p className="text-sm text-muted-foreground">
              Ingen afstemninger fundet for dette emne.
            </p>
          </div>
        )}
        {!exhausted && (
          <TopicLoadMore emneordId={emneord.id} initialSkip={pageSize} />
        )}
      </section>
    </div>
  )
}
