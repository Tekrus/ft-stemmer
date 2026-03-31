import type { NextRequest } from "next/server"
import { fetchTopicVotes } from "@/lib/oda/fetch-topics"
import { config } from "@/lib/config"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const idParam = searchParams.get("id")
  const skipParam = searchParams.get("skip")

  const emneordId = Number(idParam)
  const skip = Math.max(0, Number(skipParam ?? 0))

  if (isNaN(emneordId) || emneordId <= 0) {
    return Response.json(
      { error: "Invalid topic id" },
      { status: 400 }
    )
  }

  const result = await fetchTopicVotes(emneordId, config.pagination.defaultPageSize, skip)
  return Response.json(result)
}
