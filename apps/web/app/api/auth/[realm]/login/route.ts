import { authenticateWithPassword, createSession, verifyUserTotp } from "@petora/auth"
import { auditAuthEvent } from "@petora/core"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  getClientIp,
  hasSameOrigin,
  parseAuthRealm,
  sessionCookieName
} from "../../../../../lib/auth-api"
import { getAuthRuntime, getEncryptionMasterKey } from "../../../../../lib/auth-runtime"

export const runtime = "nodejs"

const credentialsSchema = z
  .object({
    identifier: z.string().trim().min(1).max(320),
    password: z.string().min(1).max(1024),
    totpCode: z.string().optional()
  })
  .strict()

type RouteContext = { params: Promise<{ realm: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const realm = parseAuthRealm((await context.params).realm)
  if (!realm) return NextResponse.json({ error: "not_found" }, { status: 404 })
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 })

  const ip = getClientIp(request)
  if (!ip) return NextResponse.json({ error: "client_ip_required" }, { status: 400 })

  const body = credentialsSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

  let stage = "runtime"
  try {
    const auth = getAuthRuntime()
    const attempt = { realm, identifier: body.data.identifier, ip }
    stage = "redis_readiness"
    await auth.redis.ping()
    stage = "login_rate_limit"
    const loginLimit = await auth.loginLimiter.consume(attempt)
    if (!loginLimit.allowed) {
      return NextResponse.json(
        { error: "too_many_attempts" },
        { status: 429, headers: { "Retry-After": String(loginLimit.retryAfterSeconds) } }
      )
    }

    stage = "password_authentication"
    const user = await authenticateWithPassword(auth.db, {
      realm,
      identifier: body.data.identifier,
      password: body.data.password
    })
    if (!user) {
      await auditAuthEvent(auth.db, {
        actorId: null,
        action: "auth.login.failed",
        entityType: "user",
        meta: { realm, reason: "invalid_credentials" },
        ip
      }).catch(() => undefined)
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 })
    }

    if (user.twoFactorEnabled) {
      stage = "totp_rate_limit"
      const totpLimit = await auth.totpLimiter.consume(attempt)
      if (!totpLimit.allowed) {
        return NextResponse.json(
          { error: "too_many_attempts" },
          { status: 429, headers: { "Retry-After": String(totpLimit.retryAfterSeconds) } }
        )
      }

      if (!body.data.totpCode) {
        await auditAuthEvent(auth.db, {
          actorId: user.id,
          userId: user.id,
          action: "auth.login.failed",
          entityType: "user",
          entityId: user.id,
          meta: { realm, reason: "totp_required" },
          ip
        }).catch(() => undefined)
        return NextResponse.json({ error: "invalid_credentials" }, { status: 401 })
      }
      stage = "totp_verification"
      const validCode = await verifyUserTotp(
        auth.db,
        { userId: user.id, realm, token: body.data.totpCode },
        getEncryptionMasterKey()
      )
      if (!validCode) {
        await auditAuthEvent(auth.db, {
          actorId: user.id,
          userId: user.id,
          action: "auth.login.failed",
          entityType: "user",
          entityId: user.id,
          meta: { realm, reason: "totp_invalid" },
          ip
        }).catch(() => undefined)
        return NextResponse.json({ error: "invalid_credentials" }, { status: 401 })
      }
      await auth.totpLimiter.resetIdentifier(attempt)
    }

    stage = "session_creation"
    const expiresAt = new Date(Date.now() + (realm === "staff" ? 12 : 24 * 30) * 60 * 60 * 1000)
    const session = await createSession(auth.db, {
      userId: user.id,
      realm,
      expiresAt,
      ip,
      userAgent: request.headers.get("user-agent")?.slice(0, 512)
    })
    await auth.loginLimiter.resetIdentifier(attempt)

    await auditAuthEvent(auth.db, {
      actorId: user.id,
      userId: user.id,
      action: "auth.login.succeeded",
      entityType: "user",
      entityId: user.id,
      meta: { realm, twoFactor: user.twoFactorEnabled },
      ip
    }).catch(() => undefined)

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        twoFactorEnabled: user.twoFactorEnabled
      }
    })
    response.headers.set("Cache-Control", "no-store")
    response.cookies.set(sessionCookieName(realm), session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt
    })
    return response
  } catch (error) {
    console.error("Authentication route failed", {
      stage,
      errorName: error instanceof Error ? error.name : "UnknownError"
    })
    return NextResponse.json({ error: "authentication_unavailable" }, { status: 503 })
  }
}
