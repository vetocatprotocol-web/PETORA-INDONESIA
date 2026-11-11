import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireStaffPermission } from "../../../../../lib/admin-api"
import { getAuthRuntime } from "../../../../../lib/auth-runtime"
import { listUserRoleAssignments, recordAuditLog, removeUserRoleAssignment } from "@petora/core"

export const runtime = "nodejs"

const deleteSchema = z.object({ assignmentId: z.string().uuid() }).strict()

export async function GET(request: NextRequest) {
  const auth = await requireStaffPermission(request, "user.manage")
  if ("response" in auth) return auth.response
  try {
    const { db } = getAuthRuntime()
    const assignments = await listUserRoleAssignments(db, auth.ctx.organizationId)
    return NextResponse.json({ assignments })
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireStaffPermission(request, "user.manage", { requireOrigin: true })
  if ("response" in auth) return auth.response
  const body = deleteSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  try {
    const { db } = getAuthRuntime()
    const ok = await removeUserRoleAssignment(db, auth.ctx.organizationId, body.data.assignmentId)
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 })
    await recordAuditLog(db, {
      organizationId: auth.ctx.organizationId,
      actorId: auth.ctx.userId,
      action: "user.role.unassigned",
      entityType: "user_role_assignment",
      entityId: body.data.assignmentId
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
