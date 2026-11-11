import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const VERSION = "v1"
const ALGORITHM = "aes-256-gcm"
const IV_BYTES = 12
const KEY_BYTES = 32

function assertKey(key: Buffer): void {
  if (key.length !== KEY_BYTES) throw new Error("Encryption key must be exactly 32 bytes")
}

export function encryptCredentials(
  payload: Record<string, unknown>,
  key: Buffer,
  aadContext: string
): string {
  assertKey(key)
  if (!aadContext.trim()) throw new Error("AAD context is required")
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  cipher.setAAD(Buffer.from(`petora:integration:${VERSION}:${aadContext}`, "utf8"))
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8")
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url")
  ].join(".")
}

export function decryptCredentials(
  envelope: string,
  key: Buffer,
  aadContext: string
): Record<string, unknown> {
  assertKey(key)
  const [version, ivB64, tagB64, ctB64, extra] = envelope.split(".")
  if (version !== VERSION || !ivB64 || !tagB64 || !ctB64 || extra) {
    throw new Error("Invalid credential envelope")
  }
  const iv = Buffer.from(ivB64, "base64url")
  const tag = Buffer.from(tagB64, "base64url")
  const ciphertext = Buffer.from(ctB64, "base64url")
  if (iv.length !== IV_BYTES || tag.length !== 16 || ciphertext.length === 0) {
    throw new Error("Invalid credential envelope")
  }
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAAD(Buffer.from(`petora:integration:${VERSION}:${aadContext}`, "utf8"))
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
  const parsed = JSON.parse(plaintext) as unknown
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid credential payload")
  }
  return parsed as Record<string, unknown>
}

export function maskSecret(value: string): string {
  void value
  return "••••••••"
}
