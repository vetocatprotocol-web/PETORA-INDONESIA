import { NextRequest, NextResponse } from "next/server"
import { resolveRequestSession } from "../../../../lib/auth-api"
import { getAuthRuntime } from "../../../../lib/auth-runtime"
import { listBranches, loadActor } from "@petora/core"
import { PERMISSION_CATALOG } from "@petora/rbac"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const session = await resolveRequestSession(request, "staff")
    if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
    const { db } = getAuthRuntime()
    const loaded = await loadActor(db, session.id, "staff")
    if (!loaded?.organizationId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }
    const branches = await listBranches(db, loaded.organizationId)
    return NextResponse.json(
      {
        user: {
          id: session.id,
          name: session.name,
          email: session.email,
          realm: session.realm,
          twoFactorEnabled: session.twoFactorEnabled
        },
        organizationId: loaded.organizationId,
        actor: loaded.actor,
        branches,
        permissionsCatalog: PERMISSION_CATALOG
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }
}
