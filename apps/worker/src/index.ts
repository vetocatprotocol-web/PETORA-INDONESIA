import { Worker, Queue } from "bullmq"
import { and, eq, isNull, lte, or } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import Redis from "ioredis"
import { readFileSync } from "node:fs"
import { schema } from "@petora/db"
import { processOutboundMessage } from "@petora/integrations"

const databaseUrl = process.env.DATABASE_URL
const redisUrl = process.env.REDIS_URL

if (!databaseUrl) throw new Error("DATABASE_URL is required")
if (!redisUrl) throw new Error("REDIS_URL is required")

function getEncryptionMasterKey(): Buffer {
  const encodedKey =
    process.env.ENCRYPTION_MASTER_KEY?.trim() ||
    readFileSync("/run/secrets/encryption_master_key", "utf8").trim()
  const key = Buffer.from(encodedKey, "base64url")
  if (key.length !== 32)
    throw new Error("ENCRYPTION_MASTER_KEY must be a base64url-encoded 32-byte key")
  return key
}

const pool = new Pool({ connectionString: databaseUrl })
const db = drizzle(pool, { schema })
const redis = new Redis(redisUrl, { maxRetriesPerRequest: null })
const queue = new Queue("petora-system", { connection: redis })

async function pollOutbound(): Promise<number> {
  let key: Buffer
  try {
    key = getEncryptionMasterKey()
  } catch {
    return 0
  }
  const now = new Date()
  const rows = await db
    .select({ id: schema.outboundMessages.id })
    .from(schema.outboundMessages)
    .where(
      and(
        eq(schema.outboundMessages.status, "queued"),
        or(
          isNull(schema.outboundMessages.scheduledAt),
          lte(schema.outboundMessages.scheduledAt, now)
        )
      )
    )
    .limit(20)
  for (const row of rows) {
    try {
      await processOutboundMessage(db, row.id, key)
    } catch {
      // status set inside processor on failure; continue
    }
  }
  return rows.length
}

const worker = new Worker(
  "petora-system",
  async (job) => {
    if (job.name === "health-check") {
      await pool.query("SELECT 1")
      await redis.ping()
      return { ok: true }
    }
    if (job.name === "outbound.send") {
      const outboundMessageId = (job.data as { outboundMessageId?: string } | null)
        ?.outboundMessageId
      if (!outboundMessageId) throw new Error("missing_outboundMessageId")
      const key = getEncryptionMasterKey()
      return processOutboundMessage(db, outboundMessageId, key)
    }
    if (job.name === "outbound.poll") {
      const processed = await pollOutbound()
      return { processed }
    }
    throw new Error(`No processor is registered for job: ${job.name}`)
  },
  { connection: redis }
)

worker.on("ready", () => console.info("PETORA worker connected and ready"))
worker.on("failed", (job, error) => {
  console.error(`Worker job failed (${job?.name ?? "unknown"}):`, error)
})
worker.on("error", (error) => console.error("Worker error:", error))

const pollTimer = setInterval(() => {
  void pollOutbound().catch((err) => console.error("Outbound poll error:", err))
}, 15_000)
// ensure repeatable poll job exists (best-effort)
void queue
  .add("outbound.poll", {}, { repeat: { every: 30_000 }, jobId: "outbound-poll" })
  .catch(() => {})

let isShuttingDown = false

async function shutdown() {
  if (isShuttingDown) return
  isShuttingDown = true
  clearInterval(pollTimer)
  await worker.close()
  await queue.close()
  await redis.quit()
  await pool.end()
}

process.once("SIGINT", () => void shutdown())
process.once("SIGTERM", () => void shutdown())
