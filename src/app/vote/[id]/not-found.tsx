import Link from "next/link"

export default function VoteNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="text-2xl font-bold">Afstemning ikke fundet</h2>
      <p className="mt-2 text-muted-foreground">
        Afstemningen du leder efter findes ikke. Den kan være fjernet eller ID&apos;et er ugyldigt.
      </p>
      <Link href="/" className="mt-4 inline-block text-primary underline hover:no-underline">
        Se seneste afstemninger
      </Link>
    </div>
  )
}
