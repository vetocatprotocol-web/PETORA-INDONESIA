import { chmod, chown } from "node:fs/promises"
import { resolve } from "node:path"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"
import * as schema from "./schema"
import { ensureSecret } from "./secrets"
import { seedCatalog } from "./seed"

async function main() {
  const secretDirectory = process.env.PETORA_SECRETS_DIR ?? "/run/secrets"
  const authSecretPath = resolve(secretDirectory, "auth_secret")
  const encryptionKeyPath = resolve(secretDirectory, "encryption_master_key")

  await Promise.all([
    ensureSecret("AUTH_SECRET", secretDirectory),
    ensureSecret("ENCRYPTION_MASTER_KEY", secretDirectory)
  ])

  if (typeof process.getuid === "function" && process.getuid() === 0) {
    await Promise.all([
      chown(authSecretPath, 1001, 1001),
      chown(encryptionKeyPath, 1001, 1001),
      chmod(authSecretPath, 0o400),
      chmod(encryptionKeyPath, 0o400)
    ])
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is required")

  const pool = new Pool({ connectionString: databaseUrl })
  const db = drizzle(pool, { schema })
  try {
    await migrate(db, { migrationsFolder: resolve("drizzle") })
    const result = await seedCatalog(db)
    console.log(
      `Init complete: secrets ensured, migrations applied, permissions=${result.permissionsUpserted}, systemRolesSynced=${result.systemRolesSynced}`
    )
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error("Initialization failed", error instanceof Error ? error.name : "UnknownError")
  process.exitCode = 1
})
