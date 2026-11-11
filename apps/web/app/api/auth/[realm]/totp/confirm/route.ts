import { confirmTotpEnrollment } from "@petora/auth"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  getClientIp,
  hasSameOrigin,
  parseAuthRealm,
  resolveRequestSession
} from "../../../../../../lib/auth-api"
import { getAuthRuntime, getEncryptionMasterKey } from "../../../../../../lib/auth-runtime"

export const runtime = "nodejs"

const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/) }).strict()
type RouteContext = { params: Promise<{ realm: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const realm = parseAuthRealm((await context.params).realm)
  if (!realm) return NextResponse.json({ error: "not_found" }, { status: 404 })
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 })

  const ip = getClientIp(request)
  if (!ip) return NextResponse.json({ error: "client_ip_required" }, { status: 400 })
  const body = codeSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

  try {
    const auth = getAuthRuntime()
    const session = await resolveRequestSession(request, realm)
    if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

    const attempt = { realm, identifier: session.id, ip }
    await auth.redis.ping()
    const limit = await auth.totpLimiter.consume(attempt)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "too_many_attempts" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      )
    }

    const enabled = await confirmTotpEnrollment(
      auth.db,
      { userId: session.id, realm, token: body.data.code },
      getEncryptionMasterKey()
    )
    if (!enabled) return NextResponse.json({ error: "invalid_code" }, { status: 401 })

    await auth.totpLimiter.resetIdentifier(attempt)
    return NextResponse.json(
      { twoFactorEnabled: true },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch {
    return NextResponse.json({ error: "two_factor_confirmation_unavailable" }, { status: 503 })
  }
}
