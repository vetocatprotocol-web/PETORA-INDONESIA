import { beginTotpEnrollment } from "@petora/auth"
import { NextRequest, NextResponse } from "next/server"
import {
  getClientIp,
  hasSameOrigin,
  parseAuthRealm,
  resolveRequestSession
} from "../../../../../../lib/auth-api"
import { getAuthRuntime, getEncryptionMasterKey } from "../../../../../../lib/auth-runtime"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ realm: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const realm = parseAuthRealm((await context.params).realm)
  if (!realm) return NextResponse.json({ error: "not_found" }, { status: 404 })
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 })
  const ip = getClientIp(request)
  if (!ip) return NextResponse.json({ error: "client_ip_required" }, { status: 400 })

  try {
    const auth = getAuthRuntime()
    const session = await resolveRequestSession(request, realm)
    if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

    await auth.redis.ping()
    const attempt = { realm, identifier: session.id, ip }
    const limit = await auth.totpLimiter.consume(attempt)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "too_many_attempts" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      )
    }

    const enrollment = await beginTotpEnrollment(
      auth.db,
      { userId: session.id, realm },
      getEncryptionMasterKey()
    )
    return NextResponse.json(enrollment, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "two_factor_enrollment_unavailable" }, { status: 503 })
  }
}
