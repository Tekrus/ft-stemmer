import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { fetchMember, fetchMemberVotes } from "@/lib/oda/fetch-members"
import { getPartyInfo } from "@/lib/parties"
import type { MemberVoteRecord } from "@/lib/oda/fetch-members"
import { MemberAvatar } from "@/components/member-avatar"

export const revalidate = 10800

function StanceBadge({ stance }: { readonly stance: MemberVoteRecord["stance"] }) {
  const styles = {
    for: "bg-green-50 text-green-700 ring-green-200 dark:bg-green-950/30 dark:text-green-400 dark:ring-green-800",
    against: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-800",
    absent: "bg-gray-50 text-gray-500 ring-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:ring-gray-700",
    abstained: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-800",
  }

  const labels: Record<string, string> = {
    for: "For",
    against: "Imod",
    absent: "Fravær",
    abstained: "Hverken",
  }

  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium leading-none ring-1 ${styles[stance]}`}
    >
      {labels[stance]}
    </span>
  )
}

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const memberId = Number(id)
  if (isNaN(memberId)) notFound()

  let profile
  try {
    profile = await fetchMember(memberId)
  } catch {
    notFound()
  }

  const partyInfo = getPartyInfo(profile.partyShort)
  const { votes, stats } = await fetchMemberVotes(memberId, profile.partyShort)
  const absenceRate =
    stats.totalVotes > 0 ? Math.round((stats.absentCount / stats.totalVotes) * 100) : 0

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Alle afstemninger
      </Link>

      {/* Hero card */}
      <header className="animate-fade-up mb-8 rounded-xl border border-border bg-card p-6 shadow-elevated">
        <div className="flex items-start gap-4">
          <MemberAvatar src={profile.photoUrl} alt={profile.name} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
              {profile.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/5"
                  style={{ backgroundColor: partyInfo.color }}
                />
                <span className="font-medium">{partyInfo.name}</span>
              </span>
              {profile.constituency && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-sm text-muted-foreground">{profile.constituency}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-3 gap-3 rounded-lg border border-border bg-secondary/50 p-3">
          <div className="text-center">
            <span className="block font-mono text-lg font-semibold tabular-nums">
              {stats.totalVotes}
            </span>
            <span className="text-[11px] text-muted-foreground">afstemninger</span>
          </div>
          <div className="text-center">
            <span className="block font-mono text-lg font-semibold tabular-nums text-green-700 dark:text-green-400">
              {stats.partyLoyalty}%
            </span>
            <span className="text-[11px] text-muted-foreground">partiloyalitet</span>
          </div>
          <div className="text-center">
            <span className="block font-mono text-lg font-semibold tabular-nums text-muted-foreground">
              {absenceRate}%
            </span>
            <span className="text-[11px] text-muted-foreground">fravær</span>
          </div>
        </div>
      </header>

      {/* Recent votes */}
      <section className="animate-fade-up" style={{ animationDelay: "100ms" }}>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Seneste afstemninger
        </h2>
        <div className="space-y-2">
          {votes.map((vote) => (
            <Link
              key={`${vote.voteId}-${vote.date}`}
              href={`/vote/${vote.voteId}`}
              className="group block"
            >
              <div className="rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {vote.sagNumber && (
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {vote.sagNumber}
                        </span>
                      )}
                      <StanceBadge stance={vote.stance} />
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium leading-none ring-1 ${
                          vote.passed
                            ? "bg-green-50 text-green-700 ring-green-200 dark:bg-green-950/30 dark:text-green-400 dark:ring-green-800"
                            : "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-800"
                        }`}
                      >
                        {vote.passed ? "Vedtaget" : "Forkastet"}
                      </span>
                    </div>
                    <p className="text-[15px] font-medium leading-snug tracking-[-0.01em] line-clamp-2 group-hover:text-dannebrog transition-colors duration-200">
                      {vote.title}
                    </p>
                    <time className="mt-1 block text-[11px] text-muted-foreground tabular-nums font-mono">
                      {new Date(vote.date).toLocaleDateString("da-DK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {votes.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-8 text-center shadow-card">
            <p className="text-sm text-muted-foreground">
              Ingen afstemninger fundet for dette medlem.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
