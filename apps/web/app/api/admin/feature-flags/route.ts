import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { requireStaffPermission } from "../../../../lib/admin-api"
import { getAuthRuntime } from "../../../../lib/auth-runtime"
import { recordAuditLog, setFeatureFlag } from "@petora/core"
import { schema } from "@petora/db"

export const runtime = "nodejs"

const setSchema = z
  .object({
    key: z.string().trim().min(1).max(64),
    enabled: z.boolean(),
    config: z.unknown().optional()
  })
  .strict()

export async function GET(request: NextRequest) {
  const auth = await requireStaffPermission(request, "settings.manage")
  if ("response" in auth) return auth.response
  try {
    const { db } = getAuthRuntime()
    const flags = await db
      .select()
      .from(schema.featureFlags)
      .where(eq(schema.featureFlags.organizationId, auth.ctx.organizationId))
    return NextResponse.json({ flags })
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
    await setFeatureFlag(
      db,
      auth.ctx.organizationId,
      body.data.key,
      body.data.enabled,
      body.data.config
    )
    await recordAuditLog(db, {
      organizationId: auth.ctx.organizationId,
      actorId: auth.ctx.userId,
      action: "feature_flag.set",
      entityType: "feature_flag",
      entityId: body.data.key,
      after: { enabled: body.data.enabled }
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
