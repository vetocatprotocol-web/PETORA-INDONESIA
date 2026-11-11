import { NextRequest, NextResponse } from "next/server"
import { requireStaffPermission } from "../../../../lib/admin-api"
import { getAuthRuntime } from "../../../../lib/auth-runtime"
import { listAuditLogs } from "@petora/core"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const auth = await requireStaffPermission(request, "audit.log.view")
  if ("response" in auth) return auth.response
  try {
    const { db } = getAuthRuntime()
    const limit = Number(request.nextUrl.searchParams.get("limit") || "100")
    const logs = await listAuditLogs(
      db,
      auth.ctx.organizationId,
      Number.isFinite(limit) ? limit : 100
    )
    return NextResponse.json({ logs }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }
}
