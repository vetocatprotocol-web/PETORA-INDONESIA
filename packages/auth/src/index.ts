export const authServiceName = "petora-auth"
export { authenticateWithPassword, hashPassword, verifyPassword } from "./password"
export type { AuthenticatedUser, PasswordCredentials } from "./password"
export { createLoginRateLimiter } from "./rate-limit"
export type {
  LoginAttempt,
  LoginRateLimitOptions,
  LoginRateLimitResult,
  RateLimitRule
} from "./rate-limit"
export {
  createTotpEnrollment,
  beginTotpEnrollment,
  confirmTotpEnrollment,
  decryptTotpSecret,
  encryptTotpSecret,
  verifyTotpToken,
  verifyUserTotp
} from "./two-factor"
export type { TotpEnrollment } from "./two-factor"
export { createSession, findSession, revokeSession } from "./sessions"
export type { CreateSessionInput, SessionIdentity } from "./sessions"
