import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireStaffPermission } from "../../../../../lib/admin-api"
import { getAuthRuntime } from "../../../../../lib/auth-runtime"
import { recordAuditLog, updateRole } from "@petora/core"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    defaultScope: z.enum(["all_branches", "assigned_branches", "self_only"]).optional(),
    permissions: z.array(z.string()).optional(),
    limits: z.record(z.union([z.number().int(), z.null()])).optional()
  })
  .strict()

export async function PATCH(request: NextRequest, context: Ctx) {
  const { id } = await context.params
  const auth = await requireStaffPermission(request, "user.manage", { requireOrigin: true })
  if ("response" in auth) return auth.response
  const body = patchSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  try {
    const { db } = getAuthRuntime()
    const role = await updateRole(db, auth.ctx.organizationId, id, body.data)
    if (!role) return NextResponse.json({ error: "not_found" }, { status: 404 })
    await recordAuditLog(db, {
      organizationId: auth.ctx.organizationId,
      actorId: auth.ctx.userId,
      action: "role.updated",
      entityType: "role",
      entityId: id,
      after: { name: role.name }
    })
    return NextResponse.json({ role })
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed"
    if (message === "Owner role cannot be modified")
      return NextResponse.json({ error: "owner_locked" }, { status: 403 })
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
