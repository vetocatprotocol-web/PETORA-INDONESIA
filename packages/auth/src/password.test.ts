import { describe, expect, it } from "vitest"
import { hashPassword, verifyPassword } from "./password"

describe("password hashing", () => {
  it("hashes passwords with Argon2id and rejects mismatches", async () => {
    const password = "correct horse battery staple"
    const encodedHash = await hashPassword(password)

    expect(encodedHash).toMatch(/^\$argon2id\$/)
    await expect(verifyPassword(encodedHash, password)).resolves.toBe(true)
    await expect(verifyPassword(encodedHash, "incorrect password value")).resolves.toBe(false)
  })

  it("rejects passwords outside the configured length bounds", async () => {
    await expect(hashPassword("short")).rejects.toThrow(
      "Password must be between 12 and 1024 bytes"
    )
    await expect(hashPassword("x".repeat(1025))).rejects.toThrow(
      "Password must be between 12 and 1024 bytes"
    )
  })
})
