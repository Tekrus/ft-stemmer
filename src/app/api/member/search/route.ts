import type { NextRequest } from "next/server"
import { searchMembers } from "@/lib/oda/fetch-members"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const query = searchParams.get("q") ?? ""

  if (query.trim().length < 2) {
    return Response.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 }
    )
  }

  const members = await searchMembers(query)

  // Filter to only current members (slutdato is null or in the future)
  // The ODA Aktør entity doesn't expose slutdato directly in our type,
  // but searchMembers already filters to typeid=5 (persons).
  // We return all results; the member detail page handles inactive members.
  return Response.json(members)
}
