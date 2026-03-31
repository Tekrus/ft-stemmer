import Link from "next/link"

export default function MemberNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="font-heading text-2xl font-semibold">Medlem ikke fundet</h2>
      <p className="mt-2 text-muted-foreground">
        Det medlem du leder efter findes ikke i Folketingets data.
      </p>
      <Link
        href="/search"
        className="mt-4 inline-block text-primary underline hover:no-underline"
      >
        Gå til søgning
      </Link>
    </div>
  )
}
