import { randomUUID } from "node:crypto"
import { resolve } from "node:path"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import Redis from "ioredis"
import { Pool } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { schema } from "@petora/db"
import {
  authenticateWithPassword,
  createLoginRateLimiter,
  createSession,
  findSession,
  hashPassword,
  revokeSession
} from "./index"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error("DATABASE_URL is required for auth integration tests")
const redisUrl = process.env.REDIS_URL
if (!redisUrl) throw new Error("REDIS_URL is required for auth integration tests")

const pool = new Pool({ connectionString: databaseUrl })
const db = drizzle(pool, { schema })
const redis = new Redis(redisUrl, { maxRetriesPerRequest: null })

describe("auth credentials and sessions", () => {
  beforeAll(async () => {
    await migrate(db, { migrationsFolder: resolve("packages/db/drizzle") })
  })
  afterAll(async () => {
    await Promise.all([pool.end(), redis.quit()])
  })

  it("authenticates within one realm and revokes hashed sessions", async () => {
    const userId = randomUUID()
    const email = `auth-${userId}@example.test`
    const password = "correct horse battery staple"
    const passwordHash = await hashPassword(password)
    const expiresAt = new Date(Date.now() + 60_000)

    await db.insert(schema.users).values({
      id: userId,
      realm: "staff",
      email,
      passwordHash,
      name: "Auth Integration"
    })

    try {
      const identity = await authenticateWithPassword(db, {
        realm: "staff",
        identifier: email,
        password
      })
      expect(identity).toMatchObject({ id: userId, realm: "staff", email })
      expect(identity).not.toHaveProperty("passwordHash")
      await expect(
        authenticateWithPassword(db, { realm: "customer", identifier: email, password })
      ).resolves.toBeNull()
      await expect(
        authenticateWithPassword(db, {
          realm: "staff",
          identifier: email,
          password: "wrong password"
        })
      ).resolves.toBeNull()

      const session = await createSession(db, { userId, realm: "staff", expiresAt })
      const [storedSession] = await db
        .select({ tokenHash: schema.sessions.tokenHash })
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, userId))
        .limit(1)

      expect(storedSession?.tokenHash).not.toBe(session.token)
      expect(storedSession?.tokenHash).toMatch(/^[a-f0-9]{64}$/)
      await expect(findSession(db, session.token, "staff")).resolves.toMatchObject({
        id: userId,
        realm: "staff"
      })
      await expect(findSession(db, session.token, "customer")).resolves.toBeNull()
      await expect(findSession(db, session.token, "staff", expiresAt)).resolves.toBeNull()
      await expect(revokeSession(db, session.token)).resolves.toBe(true)
      await expect(findSession(db, session.token, "staff")).resolves.toBeNull()
      await expect(revokeSession(db, session.token)).resolves.toBe(false)
    } finally {
      await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId))
      await db.delete(schema.users).where(eq(schema.users.id, userId))
    }
  })

  it("limits login attempts by identity and IP without storing raw identifiers", async () => {
    const keyPrefix = `auth-test:${randomUUID()}`
    const limiter = createLoginRateLimiter(redis, {
      keyPrefix,
      byIdentifier: { points: 1, durationSeconds: 60, blockDurationSeconds: 60 },
      byIp: { points: 2, durationSeconds: 60, blockDurationSeconds: 60 }
    })
    const attempt = {
      realm: "staff" as const,
      identifier: `owner-${randomUUID()}@example.test`,
      ip: "198.51.100.10"
    }

    try {
      await expect(limiter.consume(attempt)).resolves.toEqual({
        allowed: true,
        retryAfterSeconds: 0
      })
      const blockedByIdentity = await limiter.consume(attempt)
      expect(blockedByIdentity.allowed).toBe(false)
      expect(blockedByIdentity.retryAfterSeconds).toBeGreaterThan(0)

      await limiter.resetIdentifier(attempt)
      await expect(limiter.consume({ ...attempt, ip: "198.51.100.11" })).resolves.toEqual({
        allowed: true,
        retryAfterSeconds: 0
      })

      const blockedByIp = await limiter.consume({
        ...attempt,
        identifier: `other-${randomUUID()}@example.test`
      })
      expect(blockedByIp.allowed).toBe(false)

      const storedKeys = await redis.keys(`${keyPrefix}*`)
      expect(storedKeys.length).toBeGreaterThan(0)
      expect(storedKeys.join(" ")).not.toContain(attempt.identifier)
      expect(storedKeys.join(" ")).not.toContain(attempt.ip)
    } finally {
      const storedKeys = await redis.keys(`${keyPrefix}*`)
      if (storedKeys.length > 0) await redis.del(...storedKeys)
    }
  })
})
