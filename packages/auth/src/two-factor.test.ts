import { randomBytes } from "node:crypto"
import * as OTPAuth from "otpauth"
import { describe, expect, it } from "vitest"
import {
  createTotpEnrollment,
  decryptTotpSecret,
  encryptTotpSecret,
  verifyTotpToken
} from "./two-factor"

describe("TOTP foundations", () => {
  it("encrypts secrets with user-bound authenticated encryption", () => {
    const key = randomBytes(32)
    const userId = "user-123"
    const secret = createTotpEnrollment("staff@example.test").secret
    const envelope = encryptTotpSecret(secret, key, userId)

    expect(envelope).toMatch(/^v1\./)
    expect(envelope).not.toContain(secret)
    expect(decryptTotpSecret(envelope, key, userId)).toBe(secret)
    expect(() => decryptTotpSecret(envelope, key, "different-user")).toThrow()
    expect(() => decryptTotpSecret(envelope, randomBytes(32), userId)).toThrow()
  })

  it("creates provisioning URIs and verifies current six-digit codes", () => {
    const enrollment = createTotpEnrollment("staff@example.test")
    const totp = OTPAuth.URI.parse(enrollment.uri)
    const token = totp.generate()

    expect(enrollment.uri).toContain("otpauth://totp/")
    expect(verifyTotpToken(enrollment.secret, token)).toBe(true)
    expect(verifyTotpToken(enrollment.secret, "00000a")).toBe(false)
    expect(verifyTotpToken(enrollment.secret, "12345678")).toBe(false)
  })
})
