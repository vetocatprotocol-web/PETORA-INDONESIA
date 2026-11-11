import { mkdtemp, readFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { ensureSecret } from "./secrets"

const temporaryDirectories: string[] = []

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "petora-secrets-"))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true }))
  )
  delete process.env.AUTH_SECRET
  delete process.env.ENCRYPTION_MASTER_KEY
})

describe("persistent application secrets", () => {
  it("generates, persists, and reuses valid secrets with private permissions", async () => {
    const directory = await createTemporaryDirectory()
    const authSecret = await ensureSecret("AUTH_SECRET", directory)
    const encryptionKey = await ensureSecret("ENCRYPTION_MASTER_KEY", directory)

    expect(Buffer.byteLength(authSecret, "utf8")).toBeGreaterThanOrEqual(32)
    expect(Buffer.from(encryptionKey, "base64url")).toHaveLength(32)
    await expect(ensureSecret("AUTH_SECRET", directory)).resolves.toBe(authSecret)
    await expect(ensureSecret("ENCRYPTION_MASTER_KEY", directory)).resolves.toBe(encryptionKey)
    expect(
      (await stat(join(directory, "auth_secret")).then((file) => file.mode & 0o777)).toString(8)
    ).toBe("600")
    expect(await readFile(join(directory, "encryption_master_key"), "utf8")).toBe(
      `${encryptionKey}\n`
    )
  })

  it("validates operator-provided secrets before persisting them", async () => {
    const directory = await createTemporaryDirectory()
    process.env.AUTH_SECRET = "too-short"
    await expect(ensureSecret("AUTH_SECRET", directory)).rejects.toThrow(
      "AUTH_SECRET must contain at least 32 bytes"
    )

    process.env.AUTH_SECRET = "a".repeat(32)
    await expect(ensureSecret("AUTH_SECRET", directory)).resolves.toBe("a".repeat(32))
  })
})
