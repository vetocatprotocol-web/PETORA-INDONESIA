import { resolve } from "node:path"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error("DATABASE_URL is required for database integration tests")

const pool = new Pool({ connectionString: databaseUrl })
const migrationsFolder = resolve("packages/db/drizzle")

async function applyMigrations() {
  await migrate(drizzle(pool), { migrationsFolder })
}

describe("database migrations", () => {
  beforeAll(applyMigrations)
  afterAll(() => pool.end())

  it("creates core tables and can be applied repeatedly", async () => {
    const result = await pool.query<{ tableName: string | null }>(
      "SELECT to_regclass('public.organization')::text AS \"tableName\""
    )

    expect(result.rows[0]?.tableName).toBe("organization")
    await expect(applyMigrations()).resolves.toBeUndefined()
  })
})
