import { randomBytes } from "node:crypto"
import argon2, { type HashOptions } from "argon2"
import { and, eq, isNull, or } from "drizzle-orm"
import { schema } from "@petora/db"
import type { createDb } from "@petora/db"

const hashOptions: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1
}
const dummyHash = argon2.hash(randomBytes(32).toString("base64url"), hashOptions)

export type PasswordCredentials = {
  realm: "staff" | "customer"
  identifier: string
  password: string
}

export type AuthenticatedUser = Pick<
  typeof schema.users.$inferSelect,
  "id" | "realm" | "name" | "email" | "phone"
>

type Database = ReturnType<typeof createDb>

export async function hashPassword(password: string): Promise<string> {
  const passwordBytes = Buffer.byteLength(password, "utf8")
  if (passwordBytes < 12 || passwordBytes > 1024) {
    throw new Error("Password must be between 12 and 1024 bytes")
  }

  return argon2.hash(password, hashOptions)
}

export async function verifyPassword(encodedHash: string, password: string): Promise<boolean> {
  if (!encodedHash.startsWith("$argon2id$") || Buffer.byteLength(password, "utf8") > 1024)
    return false

  try {
    return await argon2.verify(encodedHash, password)
  } catch {
    return false
  }
}

export async function authenticateWithPassword(
  db: Database,
  credentials: PasswordCredentials
): Promise<AuthenticatedUser | null> {
  if (
    !credentials.identifier ||
    credentials.identifier.length > 320 ||
    !credentials.password ||
    Buffer.byteLength(credentials.password, "utf8") > 1024
  ) {
    return null
  }

  const [user] = await db
    .select({
      id: schema.users.id,
      realm: schema.users.realm,
      name: schema.users.name,
      email: schema.users.email,
      phone: schema.users.phone,
      passwordHash: schema.users.passwordHash
    })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.realm, credentials.realm),
        or(
          eq(schema.users.email, credentials.identifier),
          eq(schema.users.phone, credentials.identifier)
        ),
        eq(schema.users.isActive, true),
        isNull(schema.users.deletedAt)
      )
    )
    .limit(1)

  const storedHash = user?.passwordHash ?? (await dummyHash)
  const passwordMatches = await verifyPassword(storedHash, credentials.password)
  if (!user || !passwordMatches || !user.passwordHash) return null

  return {
    id: user.id,
    realm: user.realm,
    name: user.name,
    email: user.email,
    phone: user.phone
  }
}
