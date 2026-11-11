import { randomBytes } from "node:crypto"
import { chmod, mkdir, open, readFile } from "node:fs/promises"
import { join } from "node:path"

const secretFiles = {
  AUTH_SECRET: "auth_secret",
  ENCRYPTION_MASTER_KEY: "encryption_master_key"
} as const

export type SecretName = keyof typeof secretFiles

function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  )
}

function validateSecret(name: SecretName, value: string): void {
  if (name === "AUTH_SECRET" && Buffer.byteLength(value, "utf8") < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 bytes")
  }

  if (name === "ENCRYPTION_MASTER_KEY") {
    const key = Buffer.from(value, "base64url")
    if (key.length !== 32 || key.toString("base64url") !== value) {
      throw new Error("ENCRYPTION_MASTER_KEY must encode exactly 32 bytes as base64url")
    }
  }
}

async function writeSecret(filePath: string, value: string, exclusive: boolean): Promise<void> {
  const file = await open(filePath, exclusive ? "wx" : "w", 0o600)
  try {
    await file.writeFile(`${value}\n`, "utf8")
    await file.chmod(0o600)
    await file.sync()
  } finally {
    await file.close()
  }
}

export async function ensureSecret(name: SecretName, directory: string): Promise<string> {
  await mkdir(directory, { recursive: true, mode: 0o700 })
  const filePath = join(directory, secretFiles[name])
  const environmentValue = process.env[name]?.trim()

  if (environmentValue) {
    validateSecret(name, environmentValue)
    await writeSecret(filePath, environmentValue, false)
    return environmentValue
  }

  try {
    const existing = (await readFile(filePath, "utf8")).trim()
    validateSecret(name, existing)
    await chmod(filePath, 0o600)
    return existing
  } catch (error) {
    if (!hasErrorCode(error, "ENOENT")) throw error
  }

  const generated = randomBytes(32).toString("base64url")
  validateSecret(name, generated)

  try {
    await writeSecret(filePath, generated, true)
    return generated
  } catch (error) {
    if (!hasErrorCode(error, "EEXIST")) throw error
    const existing = (await readFile(filePath, "utf8")).trim()
    validateSecret(name, existing)
    await chmod(filePath, 0o600)
    return existing
  }
}
