import { NextResponse } from "next/server"
import { createDb } from "@petora/db"
import { getSetupStatus } from "@petora/core"

export const runtime = "nodejs"

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    return NextResponse.json({ initialized: false, available: false }, { status: 503 })
  }
  const db = createDb(databaseUrl)
  try {
    const status = await getSetupStatus(db)
    return NextResponse.json(
      { ...status, available: true },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch {
    return NextResponse.json({ initialized: false, available: false }, { status: 503 })
  } finally {
    await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end()
  }
}
