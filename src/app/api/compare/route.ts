import type { NextRequest } from "next/server"
import { PARTY_MAP } from "@/lib/parties"
import { fetchComparisonVotes } from "@/lib/oda/fetch-comparison"

const BATCH_SIZE = 50

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const a = searchParams.get("a")?.toUpperCase() ?? ""
  const b = searchParams.get("b")?.toUpperCase() ?? ""
  const skip = Math.max(0, Number(searchParams.get("skip") ?? 0))

  if (!PARTY_MAP[a] || !PARTY_MAP[b] || a === b) {
    return Response.json(
      { error: "Invalid party selection" },
      { status: 400 }
    )
  }

  const result = await fetchComparisonVotes(a, b, BATCH_SIZE, skip)
  return Response.json(result)
}
