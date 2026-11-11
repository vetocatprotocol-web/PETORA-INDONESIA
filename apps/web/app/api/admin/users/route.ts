import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireStaffPermission } from "../../../../lib/admin-api"
import { getAuthRuntime } from "../../../../lib/auth-runtime"
import { assignUserRole, listUsers, recordAuditLog } from "@petora/core"

export const runtime = "nodejs"

const assignSchema = z
  .object({
    userId: z.string().uuid(),
    roleId: z.string().uuid(),
    scope: z.enum(["all_branches", "assigned_branches", "self_only"]),
    branchIds: z.array(z.string().uuid()).optional()
  })
  .strict()

export async function GET(request: NextRequest) {
  const auth = await requireStaffPermission(request, "user.manage")
  if ("response" in auth) return auth.response
  try {
    const { db } = getAuthRuntime()
    const users = await listUsers(db, auth.ctx.organizationId)
    return NextResponse.json({ users })
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireStaffPermission(request, "user.manage", { requireOrigin: true })
  if ("response" in auth) return auth.response
  const body = assignSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  try {
    const { db } = getAuthRuntime()
    await assignUserRole(db, body.data)
    await recordAuditLog(db, {
      organizationId: auth.ctx.organizationId,
      actorId: auth.ctx.userId,
      action: "user.role.assigned",
      entityType: "user",
      entityId: body.data.userId,
      after: {
        roleId: body.data.roleId,
        scope: body.data.scope,
        branchIds: body.data.branchIds ?? []
      }
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
