import { NextRequest, NextResponse } from "next/server"
import { resolveRequestSession, parseAuthRealm } from "../../../../../lib/auth-api"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ realm: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const realm = parseAuthRealm((await context.params).realm)
  if (!realm) return NextResponse.json({ error: "not_found" }, { status: 404 })

  try {
    const session = await resolveRequestSession(request, realm)
    if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

    const response = NextResponse.json({
      user: {
        id: session.id,
        realm: session.realm,
        name: session.name,
        email: session.email,
        phone: session.phone,
        twoFactorEnabled: session.twoFactorEnabled
      },
      expiresAt: session.expiresAt
    })
    response.headers.set("Cache-Control", "no-store")
    return response
  } catch {
    return NextResponse.json({ error: "authentication_unavailable" }, { status: 503 })
  }
}
