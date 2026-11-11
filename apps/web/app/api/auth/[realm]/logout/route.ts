import { revokeSession } from "@petora/auth"
import { NextRequest, NextResponse } from "next/server"
import { hasSameOrigin, parseAuthRealm, sessionCookieName } from "../../../../../lib/auth-api"
import { getAuthRuntime } from "../../../../../lib/auth-runtime"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ realm: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const realm = parseAuthRealm((await context.params).realm)
  if (!realm) return NextResponse.json({ error: "not_found" }, { status: 404 })
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 })

  try {
    const cookieName = sessionCookieName(realm)
    const token = request.cookies.get(cookieName)?.value
    if (token) await revokeSession(getAuthRuntime().db, token)

    const response = NextResponse.json({ ok: true })
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0
    })
    response.headers.set("Cache-Control", "no-store")
    return response
  } catch {
    return NextResponse.json({ error: "authentication_unavailable" }, { status: 503 })
  }
}
