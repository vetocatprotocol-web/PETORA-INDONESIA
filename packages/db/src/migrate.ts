import { resolve } from "node:path"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is required")

  const pool = new Pool({ connectionString: databaseUrl })
  try {
    await migrate(drizzle(pool), { migrationsFolder: resolve("drizzle") })
    console.log("Database migrations applied successfully.")
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
