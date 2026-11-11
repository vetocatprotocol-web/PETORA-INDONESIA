import { revokeSession } from "@petora/auth"
import { auditAuthEvent } from "@petora/core"
import { NextRequest, NextResponse } from "next/server"
import {
  getClientIp,
  hasSameOrigin,
  parseAuthRealm,
  resolveRequestSession,
  sessionCookieName
} from "../../../../../lib/auth-api"
import { getAuthRuntime } from "../../../../../lib/auth-runtime"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ realm: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const realm = parseAuthRealm((await context.params).realm)
  if (!realm) return NextResponse.json({ error: "not_found" }, { status: 404 })
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 })

  try {
    const auth = getAuthRuntime()
    const token = request.cookies.get(sessionCookieName(realm))?.value
    const session = token ? await resolveRequestSession(request, realm) : null
    if (token) await revokeSession(auth.db, token)
    if (session) {
      await auditAuthEvent(auth.db, {
        actorId: session.id,
        userId: session.id,
        action: "auth.logout",
        entityType: "user",
        entityId: session.id,
        meta: { realm },
        ip: getClientIp(request)
      }).catch(() => undefined)
    }
  } catch {
    // Logout is best-effort; client state is cleared regardless.
  }

  const response = NextResponse.json({ ok: true })
  response.headers.set("Cache-Control", "no-store")
  response.cookies.set(sessionCookieName(realm), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  })
  return response
}
