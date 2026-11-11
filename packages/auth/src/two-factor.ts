import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import { and, eq, isNull, lt, or } from "drizzle-orm"
import * as OTPAuth from "otpauth"
import { schema } from "@petora/db"
import type { createDb } from "@petora/db"

const encryptionVersion = "v1"
const encryptionAlgorithm = "aes-256-gcm"
const encryptionKeyBytes = 32
const encryptionIvBytes = 12

export type TotpEnrollment = {
  secret: string
  uri: string
}

type Database = ReturnType<typeof createDb>
type TotpRealm = "staff" | "customer"

function assertEncryptionKey(key: Buffer): void {
  if (key.length !== encryptionKeyBytes) {
    throw new Error("TOTP encryption key must be exactly 32 bytes")
  }
}

function associatedData(userId: string): Buffer {
  if (!userId.trim()) throw new Error("A user ID is required to encrypt TOTP secrets")
  return Buffer.from(`petora:totp:${encryptionVersion}:${userId}`, "utf8")
}

export function createTotpEnrollment(accountLabel: string): TotpEnrollment {
  if (!accountLabel.trim() || accountLabel.length > 320) {
    throw new Error("A valid account label is required for TOTP enrollment")
  }

  const secret = new OTPAuth.Secret({ size: 20 })
  const totp = new OTPAuth.TOTP({
    issuer: "PETORA INDONESIA",
    label: accountLabel,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret
  })

  return { secret: secret.base32, uri: totp.toString() }
}

export function encryptTotpSecret(secret: string, key: Buffer, userId: string): string {
  assertEncryptionKey(key)
  if (!secret.trim()) throw new Error("TOTP secret cannot be empty")

  const iv = randomBytes(encryptionIvBytes)
  const cipher = createCipheriv(encryptionAlgorithm, key, iv)
  cipher.setAAD(associatedData(userId))
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    encryptionVersion,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url")
  ].join(".")
}

export function decryptTotpSecret(envelope: string, key: Buffer, userId: string): string {
  assertEncryptionKey(key)
  const [version, encodedIv, encodedTag, encodedCiphertext, extra] = envelope.split(".")
  if (version !== encryptionVersion || !encodedIv || !encodedTag || !encodedCiphertext || extra) {
    throw new Error("Invalid encrypted TOTP secret")
  }

  const iv = Buffer.from(encodedIv, "base64url")
  const authTag = Buffer.from(encodedTag, "base64url")
  const ciphertext = Buffer.from(encodedCiphertext, "base64url")
  if (iv.length !== encryptionIvBytes || authTag.length !== 16 || ciphertext.length === 0) {
    throw new Error("Invalid encrypted TOTP secret")
  }

  const decipher = createDecipheriv(encryptionAlgorithm, key, iv)
  decipher.setAAD(associatedData(userId))
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
}

export function verifyTotpToken(secret: string, token: string, timestamp = Date.now()): boolean {
  return getTotpStep(secret, token, timestamp) !== null
}

function getTotpStep(secret: string, token: string, timestamp: number): number | null {
  if (!/^\d{6}$/.test(token)) return null

  try {
    const totp = new OTPAuth.TOTP({
      issuer: "PETORA INDONESIA",
      label: "account",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret)
    })

    const delta = totp.validate({ token, window: 1, timestamp })
    return delta === null ? null : Math.floor(timestamp / 30_000) + delta
  } catch {
    return null
  }
}

export async function beginTotpEnrollment(
  db: Database,
  input: { userId: string; realm: TotpRealm },
  key: Buffer
): Promise<{ uri: string }> {
  const [user] = await db
    .select({
      email: schema.users.email,
      phone: schema.users.phone,
      twoFactorEnabled: schema.users.twoFactorEnabled
    })
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
  if (user.twoFactorEnabled) throw new Error("Two-factor authentication is already enabled")

  const enrollment = createTotpEnrollment(user.email ?? user.phone ?? input.userId)
  const encryptedSecret = encryptTotpSecret(enrollment.secret, key, input.userId)
  const updatedUsers = await db
    .update(schema.users)
    .set({ twoFactorSecretEnc: encryptedSecret })
    .where(
      and(
        eq(schema.users.id, input.userId),
        eq(schema.users.realm, input.realm),
        eq(schema.users.twoFactorEnabled, false),
        isNull(schema.users.deletedAt)
      )
    )
    .returning({ id: schema.users.id })

  if (updatedUsers.length === 0) throw new Error("Two-factor enrollment could not be started")
  return { uri: enrollment.uri }
}

export async function confirmTotpEnrollment(
  db: Database,
  input: { userId: string; realm: TotpRealm; token: string },
  key: Buffer,
  timestamp = Date.now()
): Promise<boolean> {
  const [user] = await db
    .select({
      twoFactorSecretEnc: schema.users.twoFactorSecretEnc,
      twoFactorEnabled: schema.users.twoFactorEnabled
    })
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

  if (!user || user.twoFactorEnabled || !user.twoFactorSecretEnc) return false

  const secret = decryptTotpSecret(user.twoFactorSecretEnc, key, input.userId)
  const step = getTotpStep(secret, input.token, timestamp)
  if (step === null) return false

  const updatedUsers = await db
    .update(schema.users)
    .set({ twoFactorEnabled: true, twoFactorLastUsedStep: step })
    .where(
      and(
        eq(schema.users.id, input.userId),
        eq(schema.users.realm, input.realm),
        eq(schema.users.twoFactorEnabled, false),
        eq(schema.users.twoFactorSecretEnc, user.twoFactorSecretEnc),
        isNull(schema.users.deletedAt)
      )
    )
    .returning({ id: schema.users.id })

  return updatedUsers.length === 1
}

export async function verifyUserTotp(
  db: Database,
  input: { userId: string; realm: TotpRealm; token: string },
  key: Buffer,
  timestamp = Date.now()
): Promise<boolean> {
  const [user] = await db
    .select({
      twoFactorEnabled: schema.users.twoFactorEnabled,
      twoFactorSecretEnc: schema.users.twoFactorSecretEnc,
      twoFactorLastUsedStep: schema.users.twoFactorLastUsedStep
    })
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

  if (!user?.twoFactorEnabled || !user.twoFactorSecretEnc) return false

  try {
    const secret = decryptTotpSecret(user.twoFactorSecretEnc, key, input.userId)
    const step = getTotpStep(secret, input.token, timestamp)
    if (
      step === null ||
      (user.twoFactorLastUsedStep !== null && step <= user.twoFactorLastUsedStep)
    ) {
      return false
    }

    const updatedUsers = await db
      .update(schema.users)
      .set({ twoFactorLastUsedStep: step })
      .where(
        and(
          eq(schema.users.id, input.userId),
          eq(schema.users.realm, input.realm),
          eq(schema.users.twoFactorEnabled, true),
          eq(schema.users.twoFactorSecretEnc, user.twoFactorSecretEnc),
          or(
            isNull(schema.users.twoFactorLastUsedStep),
            lt(schema.users.twoFactorLastUsedStep, step)
          ),
          isNull(schema.users.deletedAt)
        )
      )
      .returning({ id: schema.users.id })

    return updatedUsers.length === 1
  } catch {
    return false
  }
}
