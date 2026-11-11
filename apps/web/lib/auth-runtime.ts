import { readFileSync } from "node:fs"
import { createDb } from "@petora/db"
import { createLoginRateLimiter } from "@petora/auth"
import Redis from "ioredis"

export type AuthRealm = "staff" | "customer"

export type AuthRuntime = {
  db: ReturnType<typeof createDb>
  redis: Redis
  loginLimiter: ReturnType<typeof createLoginRateLimiter>
  totpLimiter: ReturnType<typeof createLoginRateLimiter>
}

type GlobalWithAuthRuntime = typeof globalThis & {
  __petoraAuthRuntime?: AuthRuntime
}

const globalWithAuthRuntime = globalThis as GlobalWithAuthRuntime

function positiveIntegerEnv(name: string, defaultValue: number): number {
  const rawValue = process.env[name]
  if (rawValue === undefined) return defaultValue

  const value = Number(rawValue)
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`)
  }
  return value
}

export function getAuthRuntime(): AuthRuntime {
  if (globalWithAuthRuntime.__petoraAuthRuntime) return globalWithAuthRuntime.__petoraAuthRuntime

  const databaseUrl = process.env.DATABASE_URL
  const redisUrl = process.env.REDIS_URL
  if (!databaseUrl || !redisUrl) throw new Error("Authentication storage is unavailable")

  const redis = new Redis(redisUrl, { maxRetriesPerRequest: null })
  const loginLimiter = createLoginRateLimiter(redis, {
    keyPrefix: "petora:auth:login",
    byIdentifier: {
      points: positiveIntegerEnv("AUTH_LOGIN_IDENTIFIER_ATTEMPTS", 5),
      durationSeconds: positiveIntegerEnv("AUTH_LOGIN_IDENTIFIER_WINDOW_SECONDS", 900),
      blockDurationSeconds: positiveIntegerEnv("AUTH_LOGIN_IDENTIFIER_BLOCK_SECONDS", 900)
    },
    byIp: {
      points: positiveIntegerEnv("AUTH_LOGIN_IP_ATTEMPTS", 30),
      durationSeconds: positiveIntegerEnv("AUTH_LOGIN_IP_WINDOW_SECONDS", 900),
      blockDurationSeconds: positiveIntegerEnv("AUTH_LOGIN_IP_BLOCK_SECONDS", 900)
    }
  })
  const totpLimiter = createLoginRateLimiter(redis, {
    keyPrefix: "petora:auth:totp",
    byIdentifier: {
      points: positiveIntegerEnv("AUTH_TOTP_IDENTIFIER_ATTEMPTS", 5),
      durationSeconds: positiveIntegerEnv("AUTH_TOTP_IDENTIFIER_WINDOW_SECONDS", 300),
      blockDurationSeconds: positiveIntegerEnv("AUTH_TOTP_IDENTIFIER_BLOCK_SECONDS", 900)
    },
    byIp: {
      points: positiveIntegerEnv("AUTH_TOTP_IP_ATTEMPTS", 20),
      durationSeconds: positiveIntegerEnv("AUTH_TOTP_IP_WINDOW_SECONDS", 300),
      blockDurationSeconds: positiveIntegerEnv("AUTH_TOTP_IP_BLOCK_SECONDS", 900)
    }
  })

  const runtime = { db: createDb(databaseUrl), redis, loginLimiter, totpLimiter }
  globalWithAuthRuntime.__petoraAuthRuntime = runtime
  return runtime
}

export async function closeAuthRuntime(): Promise<void> {
  const runtime = globalWithAuthRuntime.__petoraAuthRuntime
  if (!runtime) return

  delete globalWithAuthRuntime.__petoraAuthRuntime
  await Promise.all([runtime.redis.quit(), runtime.db.$client.end()])
}

export function getEncryptionMasterKey(): Buffer {
  const encodedKey =
    process.env.ENCRYPTION_MASTER_KEY?.trim() ||
    readFileSync("/run/secrets/encryption_master_key", "utf8").trim()

  const key = Buffer.from(encodedKey, "base64url")
  if (key.length !== 32)
    throw new Error("ENCRYPTION_MASTER_KEY must be a base64url-encoded 32-byte key")
  return key
}
