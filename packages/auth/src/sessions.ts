import { createHash, randomBytes } from "node:crypto"
import { and, eq, gt, isNull } from "drizzle-orm"
import { schema } from "@petora/db"
import type { createDb } from "@petora/db"
import type { AuthenticatedUser } from "./password"

type Database = ReturnType<typeof createDb>
type SessionRealm = "staff" | "customer"

export type CreateSessionInput = {
  userId: string
  realm: SessionRealm
  expiresAt: Date
  ip?: string
  userAgent?: string
}

export type SessionIdentity = AuthenticatedUser & {
  sessionId: string
  expiresAt: Date
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

function isSessionToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token)
}

export async function createSession(
  db: Database,
  input: CreateSessionInput,
  now = new Date()
): Promise<{ token: string; expiresAt: Date }> {
  if (input.expiresAt <= now) throw new Error("Session expiry must be in the future")

  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.id, input.userId),
        eq(schema.users.realm, input.realm),
        eq(schema.users.isActive, true),
        isNull(schema.users.deletedAt)
      )
    )
    .limit(1)

  if (!user) throw new Error("An active user in the requested realm is required")

  const token = randomBytes(32).toString("base64url")
  await db.insert(schema.sessions).values({
    userId: user.id,
    realm: input.realm,
    tokenHash: hashToken(token),
    expiresAt: input.expiresAt,
    ip: input.ip,
    userAgent: input.userAgent
  })

  return { token, expiresAt: input.expiresAt }
}

export async function findSession(
  db: Database,
  token: string,
  realm: SessionRealm,
  now = new Date()
): Promise<SessionIdentity | null> {
  if (!isSessionToken(token)) return null

  const [session] = await db
    .select({
      sessionId: schema.sessions.id,
      expiresAt: schema.sessions.expiresAt,
      id: schema.users.id,
      realm: schema.users.realm,
      name: schema.users.name,
      email: schema.users.email,
      phone: schema.users.phone,
      twoFactorEnabled: schema.users.twoFactorEnabled
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(
      and(
        eq(schema.sessions.tokenHash, hashToken(token)),
        eq(schema.sessions.realm, realm),
        eq(schema.users.realm, realm),
        gt(schema.sessions.expiresAt, now),
        isNull(schema.sessions.revokedAt),
        eq(schema.users.isActive, true),
        isNull(schema.users.deletedAt)
      )
    )
    .limit(1)

  return session ?? null
}

export async function revokeSession(
  db: Database,
  token: string,
  now = new Date()
): Promise<boolean> {
  if (!isSessionToken(token)) return false

  const revoked = await db
    .update(schema.sessions)
    .set({ revokedAt: now })
    .where(and(eq(schema.sessions.tokenHash, hashToken(token)), isNull(schema.sessions.revokedAt)))
    .returning({ id: schema.sessions.id })

  return revoked.length > 0
}
