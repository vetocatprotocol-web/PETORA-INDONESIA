import { randomUUID } from "node:crypto"
import { resolve } from "node:path"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { NextRequest } from "next/server"
import { Pool } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTotpEnrollment, encryptTotpSecret, hashPassword } from "@petora/auth"
import { schema } from "@petora/db"
import * as OTPAuth from "otpauth"
import { POST as login } from "../app/api/auth/[realm]/login/route"
import { POST as logout } from "../app/api/auth/[realm]/logout/route"
import { GET as getSession } from "../app/api/auth/[realm]/session/route"
import { closeAuthRuntime } from "../lib/auth-runtime"

const databaseUrl = process.env.DATABASE_URL
const redisUrl = process.env.REDIS_URL
if (!databaseUrl || !redisUrl)
  throw new Error("DATABASE_URL and REDIS_URL are required for auth route tests")

const pool = new Pool({ connectionString: databaseUrl })
const db = drizzle(pool, { schema })
const origin = "https://petora.example.test"
const routeContext = { params: Promise.resolve({ realm: "staff" }) }

describe("auth route handlers", () => {
  beforeAll(async () => {
    process.env.ENCRYPTION_MASTER_KEY = Buffer.alloc(32, 7).toString("base64url")
    await migrate(db, { migrationsFolder: resolve("packages/db/drizzle") })
  })
  afterAll(async () => {
    await closeAuthRuntime()
    await pool.end()
  })

  it("logs in, scopes sessions to their realm, and revokes on logout", async () => {
    const userId = randomUUID()
    const email = `route-${userId}@example.test`
    const password = "correct horse battery staple"
    await db.insert(schema.users).values({
      id: userId,
      realm: "staff",
      email,
      passwordHash: await hashPassword(password),
      name: "Route Integration"
    })

    try {
      const requestHeaders = {
        origin,
        host: "petora.example.test",
        "x-forwarded-host": "petora.example.test",
        "x-forwarded-proto": "https",
        "x-forwarded-for": `198.51.100.${(Number.parseInt(userId.slice(-2), 16) % 254) + 1}`,
        "content-type": "application/json"
      }
      const foreignOriginResponse = await login(
        new NextRequest(`${origin}/api/auth/staff/login`, {
          method: "POST",
          headers: { ...requestHeaders, origin: "https://attacker.example" },
          body: JSON.stringify({ identifier: email, password })
        }),
        routeContext
      )
      expect(foreignOriginResponse.status).toBe(403)

      const loginResponse = await login(
        new NextRequest(`${origin}/api/auth/staff/login`, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({ identifier: email, password })
        }),
        routeContext
      )
      expect(loginResponse.status).toBe(200)
      const cookie = loginResponse.cookies.get("petora_staff_session")
      expect(cookie?.value).toBeTruthy()
      expect(cookie?.httpOnly).toBe(true)
      expect(cookie?.sameSite).toBe("lax")

      const staffSessionRequest = new NextRequest(`${origin}/api/auth/staff/session`, {
        headers: { cookie: `petora_staff_session=${cookie?.value}` }
      })
      const staffSessionResponse = await getSession(staffSessionRequest, routeContext)
      expect(staffSessionResponse.status).toBe(200)
      await expect(staffSessionResponse.json()).resolves.toMatchObject({
        user: { id: userId, realm: "staff" }
      })

      const crossRealmRequest = new NextRequest(`${origin}/api/auth/customer/session`, {
        headers: { cookie: `petora_customer_session=${cookie?.value}` }
      })
      const crossRealmResponse = await getSession(crossRealmRequest, {
        params: Promise.resolve({ realm: "customer" })
      })
      expect(crossRealmResponse.status).toBe(401)

      const logoutResponse = await logout(
        new NextRequest(`${origin}/api/auth/staff/logout`, {
          method: "POST",
          headers: {
            origin,
            host: "petora.example.test",
            cookie: `petora_staff_session=${cookie?.value}`
          }
        }),
        routeContext
      )
      expect(logoutResponse.status).toBe(200)
      expect(logoutResponse.cookies.get("petora_staff_session")?.maxAge).toBe(0)
      expect((await getSession(staffSessionRequest, routeContext)).status).toBe(401)
    } finally {
      await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId))
      await db.delete(schema.users).where(eq(schema.users.id, userId))
    }
  })

  it("issues a separate customer cookie and does not accept it in the staff realm", async () => {
    const userId = randomUUID()
    const email = `customer-${userId}@example.test`
    const password = "customer password for tests"
    await db.insert(schema.users).values({
      id: userId,
      realm: "customer",
      email,
      passwordHash: await hashPassword(password),
      name: "Customer Route Integration"
    })

    try {
      const requestHeaders = {
        origin,
        host: "petora.example.test",
        "x-forwarded-host": "petora.example.test",
        "x-forwarded-proto": "https",
        "x-forwarded-for": `203.0.113.${(Number.parseInt(userId.slice(-2), 16) % 254) + 1}`,
        "content-type": "application/json"
      }
      const response = await login(
        new NextRequest(`${origin}/api/auth/customer/login`, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({ identifier: email, password })
        }),
        { params: Promise.resolve({ realm: "customer" }) }
      )

      expect(response.status).toBe(200)
      const cookie = response.cookies.get("petora_customer_session")
      expect(cookie?.httpOnly).toBe(true)
      const customerSession = await getSession(
        new NextRequest(`${origin}/api/auth/customer/session`, {
          headers: { cookie: `petora_customer_session=${cookie?.value}` }
        }),
        { params: Promise.resolve({ realm: "customer" }) }
      )
      expect(customerSession.status).toBe(200)

      const staffSession = await getSession(
        new NextRequest(`${origin}/api/auth/staff/session`, {
          headers: { cookie: `petora_staff_session=${cookie?.value}` }
        }),
        routeContext
      )
      expect(staffSession.status).toBe(401)
    } finally {
      await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId))
      await db.delete(schema.users).where(eq(schema.users.id, userId))
    }
  })

  it("requires a fresh TOTP code when the staff account has 2FA enabled", async () => {
    const userId = randomUUID()
    const email = `two-factor-${userId}@example.test`
    const password = "two factor password for tests"
    const key = Buffer.alloc(32, 7)
    const enrollment = createTotpEnrollment(email)
    await db.insert(schema.users).values({
      id: userId,
      realm: "staff",
      email,
      passwordHash: await hashPassword(password),
      name: "Two Factor Route Integration",
      twoFactorEnabled: true,
      twoFactorSecretEnc: encryptTotpSecret(enrollment.secret, key, userId)
    })

    try {
      const requestHeaders = {
        origin,
        host: "petora.example.test",
        "x-forwarded-host": "petora.example.test",
        "x-forwarded-proto": "https",
        "x-forwarded-for": `192.0.2.${(Number.parseInt(userId.slice(-2), 16) % 254) + 1}`,
        "content-type": "application/json"
      }
      async function submitLogin(totpCode?: string) {
        return login(
          new NextRequest(`${origin}/api/auth/staff/login`, {
            method: "POST",
            headers: requestHeaders,
            body: JSON.stringify({ identifier: email, password, ...(totpCode ? { totpCode } : {}) })
          }),
          routeContext
        )
      }

      expect((await submitLogin()).status).toBe(401)
      expect((await submitLogin("000000")).status).toBe(401)

      const totp = new OTPAuth.TOTP({
        issuer: "PETORA INDONESIA",
        label: email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(enrollment.secret)
      })
      const currentTimestamp = Date.now()
      const code = totp.generate({ timestamp: currentTimestamp })
      const success = await login(
        new NextRequest(`${origin}/api/auth/staff/login`, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({ identifier: email, password, totpCode: code })
        }),
        routeContext
      )
      expect(success.status).toBe(200)
      expect(success.cookies.get("petora_staff_session")?.httpOnly).toBe(true)

      const replay = await login(
        new NextRequest(`${origin}/api/auth/staff/login`, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({ identifier: email, password, totpCode: code })
        }),
        routeContext
      )
      expect(replay.status).toBe(401)
    } finally {
      await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId))
      await db.delete(schema.users).where(eq(schema.users.id, userId))
    }
  })
})
