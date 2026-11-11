import { NextRequest, NextResponse } from "next/server"
import { can, type Actor } from "@petora/rbac"
import { loadActor } from "@petora/core"
import { hasSameOrigin, resolveRequestSession } from "./auth-api"
import { getAuthRuntime } from "./auth-runtime"

export type AdminContext = {
  actor: Actor
  organizationId: string
  userId: string
}

export async function requireStaffPermission(
  request: NextRequest,
  permission: string,
  options?: { requireOrigin?: boolean }
): Promise<{ ctx: AdminContext } | { response: NextResponse }> {
  if (options?.requireOrigin && !hasSameOrigin(request)) {
    return { response: NextResponse.json({ error: "invalid_origin" }, { status: 403 }) }
  }
  try {
    const session = await resolveRequestSession(request, "staff")
    if (!session)
      return { response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) }
    const { db } = getAuthRuntime()
    const loaded = await loadActor(db, session.id, "staff")
    if (!loaded || !loaded.organizationId) {
      return { response: NextResponse.json({ error: "forbidden" }, { status: 403 }) }
    }
    if (!can({ actor: loaded.actor, permission })) {
      return { response: NextResponse.json({ error: "forbidden" }, { status: 403 }) }
    }
    return {
      ctx: { actor: loaded.actor, organizationId: loaded.organizationId, userId: session.id }
    }
  } catch {
    return { response: NextResponse.json({ error: "unavailable" }, { status: 503 }) }
  }
}
