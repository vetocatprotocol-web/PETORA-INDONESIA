import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireStaffPermission } from "../../../../lib/admin-api"
import { getAuthRuntime } from "../../../../lib/auth-runtime"
import { cloneRole, createRole, listRoles, recordAuditLog } from "@petora/core"
import { PERMISSION_CATALOG } from "@petora/rbac"

export const runtime = "nodejs"

const createSchema = z
  .object({
    key: z.string().trim().min(2).max(40),
    name: z.string().trim().min(2).max(120),
    defaultScope: z.enum(["all_branches", "assigned_branches", "self_only"]).optional(),
    permissions: z.array(z.string()).optional(),
    limits: z.record(z.union([z.number().int(), z.null()])).optional(),
    sourceRoleId: z.string().uuid().optional()
  })
  .strict()

export async function GET(request: NextRequest) {
  const auth = await requireStaffPermission(request, "user.manage")
  if ("response" in auth) return auth.response
  try {
    const { db } = getAuthRuntime()
    const roles = await listRoles(db, auth.ctx.organizationId)
    return NextResponse.json({ roles, catalog: PERMISSION_CATALOG })
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireStaffPermission(request, "user.manage", { requireOrigin: true })
  if ("response" in auth) return auth.response
  const body = createSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  try {
    const { db } = getAuthRuntime()
    const role = body.data.sourceRoleId
      ? await cloneRole(db, auth.ctx.organizationId, body.data.sourceRoleId, {
          key: body.data.key,
          name: body.data.name
        })
      : await createRole(db, auth.ctx.organizationId, body.data)
    if (!role) return NextResponse.json({ error: "source_not_found" }, { status: 404 })
    await recordAuditLog(db, {
      organizationId: auth.ctx.organizationId,
      actorId: auth.ctx.userId,
      action: body.data.sourceRoleId ? "role.cloned" : "role.created",
      entityType: "role",
      entityId: role.id,
      after: { key: role.key, name: role.name, sourceRoleId: body.data.sourceRoleId }
    })
    return NextResponse.json({ role }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
