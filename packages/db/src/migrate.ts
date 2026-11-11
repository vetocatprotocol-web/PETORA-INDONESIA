import { sql } from "drizzle-orm"
import { createDb } from "./index"

async function main() {
  const db = createDb(process.env.DATABASE_URL ?? "")
  await db.execute(sql`SELECT 1`)
  console.log("Migration placeholder: schema loaded via drizzle-kit")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
