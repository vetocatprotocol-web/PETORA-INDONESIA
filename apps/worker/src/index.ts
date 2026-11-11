import { Worker } from "bullmq"
import { Pool } from "pg"
import Redis from "ioredis"

const databaseUrl = process.env.DATABASE_URL
const redisUrl = process.env.REDIS_URL

if (!databaseUrl) throw new Error("DATABASE_URL is required")
if (!redisUrl) throw new Error("REDIS_URL is required")

const database = new Pool({ connectionString: databaseUrl })
const redis = new Redis(redisUrl, { maxRetriesPerRequest: null })
const worker = new Worker(
  "petora-system",
  async (job) => {
    if (job.name !== "health-check") {
      throw new Error(`No processor is registered for job: ${job.name}`)
    }

    await database.query("SELECT 1")
    await redis.ping()
    return { ok: true }
  },
  { connection: redis }
)

worker.on("ready", () => console.info("PETORA worker connected and ready"))
worker.on("failed", (job, error) => {
  console.error(`Worker job failed (${job?.name ?? "unknown"}):`, error)
})
worker.on("error", (error) => console.error("Worker error:", error))

let isShuttingDown = false

async function shutdown() {
  if (isShuttingDown) return
  isShuttingDown = true
  await worker.close()
  await redis.quit()
  await database.end()
}

process.once("SIGINT", () => void shutdown())
process.once("SIGTERM", () => void shutdown())
