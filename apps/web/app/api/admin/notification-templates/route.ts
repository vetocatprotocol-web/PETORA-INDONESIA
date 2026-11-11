import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireStaffPermission } from "../../../../lib/admin-api"
import { getAuthRuntime } from "../../../../lib/auth-runtime"
import { listMessageTemplates, recordAuditLog, upsertMessageTemplate } from "@petora/core"

export const runtime = "nodejs"

const schema = z
  .object({
    key: z.string().trim().min(1).max(80),
    channel: z.enum(["whatsapp", "email", "inbox"]),
    lang: z.string().trim().min(2).max(8).optional(),
    subject: z.string().trim().max(300).nullable().optional(),
    body: z.string().trim().min(1).max(10000),
    variables: z.array(z.string().trim().max(64)).optional()
  })
  .strict()

export async function GET(request: NextRequest) {
  const auth = await requireStaffPermission(request, "settings.manage")
  if ("response" in auth) return auth.response
  try {
    const { db } = getAuthRuntime()
    const templates = await listMessageTemplates(db, auth.ctx.organizationId)
    return NextResponse.json({ templates })
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireStaffPermission(request, "settings.manage", { requireOrigin: true })
  if ("response" in auth) return auth.response
  const body = schema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  try {
    const { db } = getAuthRuntime()
    const template = await upsertMessageTemplate(db, {
      organizationId: auth.ctx.organizationId,
      ...body.data
    })
    await recordAuditLog(db, {
      organizationId: auth.ctx.organizationId,
      actorId: auth.ctx.userId,
      action: "notification_template.upserted",
      entityType: "message_template",
      entityId: template?.id ?? null,
      after: { key: body.data.key, channel: body.data.channel, lang: body.data.lang ?? "id" }
    })
    return NextResponse.json({ template })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
