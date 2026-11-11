import { NextRequest, NextResponse } from "next/server"
import { requireStaffPermission } from "../../../../../lib/admin-api"
import { getAuthRuntime } from "../../../../../lib/auth-runtime"
import { deleteMessageTemplate, recordAuditLog } from "@petora/core"

export const runtime = "nodejs"
type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(request: NextRequest, context: Ctx) {
  const { id } = await context.params
  const auth = await requireStaffPermission(request, "settings.manage", { requireOrigin: true })
  if ("response" in auth) return auth.response
  try {
    const { db } = getAuthRuntime()
    const ok = await deleteMessageTemplate(db, auth.ctx.organizationId, id)
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 })
    await recordAuditLog(db, {
      organizationId: auth.ctx.organizationId,
      actorId: auth.ctx.userId,
      action: "notification_template.deleted",
      entityType: "message_template",
      entityId: id
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
