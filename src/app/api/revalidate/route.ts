import { revalidatePath } from "next/cache"
import { kvDel } from "@/lib/kv/client"
import { NextResponse, type NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret")
  const envSet = !!process.env.REVALIDATE_SECRET
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized", envSet, secretLength: process.env.REVALIDATE_SECRET?.length ?? 0 }, { status: 401 })
  }

  const deleted = await kvDel("oda:v1:/Afstemning*")
  revalidatePath("/", "page")
  revalidatePath("/vote/[id]", "page")
  revalidatePath("/party/[abbreviation]", "page")

  return NextResponse.json({ ok: true, keysDeleted: deleted })
}
