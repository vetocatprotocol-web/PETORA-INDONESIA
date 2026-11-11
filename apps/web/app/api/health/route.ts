import { createDb } from "@petora/db"
import { sql } from "drizzle-orm"

export const runtime = "nodejs"

const databaseUrl = process.env.DATABASE_URL
const db = databaseUrl ? createDb(databaseUrl) : undefined

export async function GET() {
  if (!db) return Response.json({ ok: false, service: "web" }, { status: 503 })

  await db.execute(sql`SELECT 1`)
  return Response.json({ ok: true, service: "web" })
}
