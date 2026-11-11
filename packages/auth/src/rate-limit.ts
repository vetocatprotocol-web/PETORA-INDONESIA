import { createHash } from "node:crypto"
import Redis from "ioredis"
import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible"

export type RateLimitRule = {
  points: number
  durationSeconds: number
  blockDurationSeconds: number
}

export type LoginAttempt = {
  realm: "staff" | "customer"
  identifier: string
  ip: string
}

export type LoginRateLimitOptions = {
  keyPrefix: string
  byIdentifier: RateLimitRule
  byIp: RateLimitRule
}

export type LoginRateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
}

function validateRule(rule: RateLimitRule): void {
  if (
    !Number.isSafeInteger(rule.points) ||
    rule.points < 1 ||
    !Number.isSafeInteger(rule.durationSeconds) ||
    rule.durationSeconds < 1 ||
    !Number.isSafeInteger(rule.blockDurationSeconds) ||
    rule.blockDurationSeconds < 1
  ) {
    throw new Error("Rate limit points, duration, and block duration must be positive integers")
  }
}

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

export function createLoginRateLimiter(redis: Redis, options: LoginRateLimitOptions) {
  if (!options.keyPrefix.trim()) throw new Error("A Redis rate-limit key prefix is required")
  validateRule(options.byIdentifier)
  validateRule(options.byIp)

  const byIdentifier = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: `${options.keyPrefix}:identity`,
    points: options.byIdentifier.points,
    duration: options.byIdentifier.durationSeconds,
    blockDuration: options.byIdentifier.blockDurationSeconds,
    rejectIfRedisNotReady: true
  })
  const byIp = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: `${options.keyPrefix}:ip`,
    points: options.byIp.points,
    duration: options.byIp.durationSeconds,
    blockDuration: options.byIp.blockDurationSeconds,
    rejectIfRedisNotReady: true
  })

  function identifierKey(attempt: Pick<LoginAttempt, "realm" | "identifier">): string {
    const identifier = attempt.identifier.trim().toLocaleLowerCase("en-US")
    return `${attempt.realm}:${digest(identifier)}`
  }

  function ipKey(ip: string): string {
    return digest(ip.trim())
  }

  return {
    async consume(attempt: LoginAttempt): Promise<LoginRateLimitResult> {
      if (!attempt.identifier.trim() || !attempt.ip.trim()) {
        throw new Error("Login rate-limit identity and IP are required")
      }

      const results = await Promise.allSettled([
        byIdentifier.consume(identifierKey(attempt)),
        byIp.consume(ipKey(attempt.ip))
      ])

      let retryAfterMilliseconds = 0
      for (const result of results) {
        if (result.status === "fulfilled") continue
        if (!(result.reason instanceof RateLimiterRes)) throw result.reason
        retryAfterMilliseconds = Math.max(retryAfterMilliseconds, result.reason.msBeforeNext)
      }

      return {
        allowed: retryAfterMilliseconds === 0,
        retryAfterSeconds: Math.ceil(retryAfterMilliseconds / 1000)
      }
    },

    async resetIdentifier(attempt: Pick<LoginAttempt, "realm" | "identifier">): Promise<void> {
      await byIdentifier.delete(identifierKey(attempt))
    }
  }
}
