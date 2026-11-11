import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { and, eq, isNull } from "drizzle-orm"
import { requireStaffPermission } from "../../../../lib/admin-api"
import { getAuthRuntime } from "../../../../lib/auth-runtime"
import { recordAuditLog, setSetting } from "@petora/core"
import { schema } from "@petora/db"

export const runtime = "nodejs"

const setSchema = z
  .object({
    key: z.string().trim().min(1).max(128),
    value: z.unknown(),
    branchId: z.string().uuid().nullable().optional()
  })
  .strict()

export async function GET(request: NextRequest) {
  const auth = await requireStaffPermission(request, "settings.manage")
  if ("response" in auth) return auth.response
  try {
    const { db } = getAuthRuntime()
    const branchId = request.nextUrl.searchParams.get("branchId")
    const where = and(
      eq(schema.settings.organizationId, auth.ctx.organizationId),
      branchId ? eq(schema.settings.branchId, branchId) : isNull(schema.settings.branchId)
    )
    const settings = await db.select().from(schema.settings).where(where)
    return NextResponse.json({ settings })
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireStaffPermission(request, "settings.manage", { requireOrigin: true })
  if ("response" in auth) return auth.response
  const body = setSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  try {
    const { db } = getAuthRuntime()
    await setSetting(
      db,
      auth.ctx.organizationId,
      body.data.key,
      body.data.value,
      body.data.branchId ?? null
    )
    await recordAuditLog(db, {
      organizationId: auth.ctx.organizationId,
      actorId: auth.ctx.userId,
      action: "setting.set",
      entityType: "setting",
      entityId: body.data.key,
      after: { branchId: body.data.branchId ?? null }
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
