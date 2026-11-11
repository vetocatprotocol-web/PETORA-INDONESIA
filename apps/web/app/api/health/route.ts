import { createDb } from "@petora/db"
import { sql } from "drizzle-orm"

export const runtime = "nodejs"

export async function GET() {
  const db = createDb(process.env.DATABASE_URL ?? "")
  await db.execute(sql`SELECT 1`)
  return Response.json({ ok: true, service: "web" })
}
