import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireStaffPermission } from "../../../../lib/admin-api"
import { getAuthRuntime } from "../../../../lib/auth-runtime"
import {
  deleteNotificationRule,
  listNotificationRules,
  recordAuditLog,
  upsertNotificationRule
} from "@petora/core"

export const runtime = "nodejs"

const upsertSchema = z
  .object({
    eventKey: z.string().trim().min(1).max(80),
    channel: z.enum(["whatsapp", "email", "inbox"]),
    templateKey: z.string().trim().min(1).max(80),
    audience: z.enum(["customer", "staff_role", "owner"]),
    audienceRef: z.string().trim().max(80).nullable().optional(),
    enabled: z.boolean().optional()
  })
  .strict()

const deleteSchema = z.object({ id: z.string().uuid() }).strict()

export async function GET(request: NextRequest) {
  const auth = await requireStaffPermission(request, "settings.manage")
  if ("response" in auth) return auth.response
  try {
    const { db } = getAuthRuntime()
    const rules = await listNotificationRules(db, auth.ctx.organizationId)
    return NextResponse.json({ rules })
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireStaffPermission(request, "settings.manage", { requireOrigin: true })
  if ("response" in auth) return auth.response
  const body = upsertSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  try {
    const { db } = getAuthRuntime()
    const rule = await upsertNotificationRule(db, {
      organizationId: auth.ctx.organizationId,
      ...body.data
    })
    await recordAuditLog(db, {
      organizationId: auth.ctx.organizationId,
      actorId: auth.ctx.userId,
      action: "notification_rule.upserted",
      entityType: "notification_rule",
      entityId: rule?.id ?? null,
      after: { eventKey: body.data.eventKey, channel: body.data.channel }
    })
    return NextResponse.json({ rule })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireStaffPermission(request, "settings.manage", { requireOrigin: true })
  if ("response" in auth) return auth.response
  const body = deleteSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  try {
    const { db } = getAuthRuntime()
    const ok = await deleteNotificationRule(db, auth.ctx.organizationId, body.data.id)
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 })
    await recordAuditLog(db, {
      organizationId: auth.ctx.organizationId,
      actorId: auth.ctx.userId,
      action: "notification_rule.deleted",
      entityType: "notification_rule",
      entityId: body.data.id
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
