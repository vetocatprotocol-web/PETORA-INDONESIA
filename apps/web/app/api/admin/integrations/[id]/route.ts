import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireStaffPermission } from "../../../../../lib/admin-api"
import { getAuthRuntime, getEncryptionMasterKey } from "../../../../../lib/auth-runtime"
import { deleteConnection, updateConnection } from "@petora/integrations"
import { recordAuditLog } from "@petora/core"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    config: z.record(z.unknown()).optional(),
    credentials: z.record(z.unknown()).optional(),
    environment: z.enum(["sandbox", "production"]).optional(),
    isActive: z.boolean().optional()
  })
  .strict()

export async function PATCH(request: NextRequest, context: Ctx) {
  const { id } = await context.params
  const auth = await requireStaffPermission(request, "integration.config.manage", {
    requireOrigin: true
  })
  if ("response" in auth) return auth.response
  const body = patchSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  try {
    const { db } = getAuthRuntime()
    const key = getEncryptionMasterKey()
    const connection = await updateConnection(db, id, auth.ctx.organizationId, body.data, key)
    if (!connection) return NextResponse.json({ error: "not_found" }, { status: 404 })
    await recordAuditLog(db, {
      organizationId: auth.ctx.organizationId,
      actorId: auth.ctx.userId,
      action: "integration.connection.updated",
      entityType: "integration_connection",
      entityId: id,
      after: { name: connection.name, isActive: connection.isActive }
    })
    return NextResponse.json({ connection })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const { id } = await context.params
  const auth = await requireStaffPermission(request, "integration.config.manage", {
    requireOrigin: true
  })
  if ("response" in auth) return auth.response
  try {
    const { db } = getAuthRuntime()
    const ok = await deleteConnection(db, id, auth.ctx.organizationId)
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 })
    await recordAuditLog(db, {
      organizationId: auth.ctx.organizationId,
      actorId: auth.ctx.userId,
      action: "integration.connection.deleted",
      entityType: "integration_connection",
      entityId: id
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
