import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireStaffPermission } from "../../../../lib/admin-api"
import { getAuthRuntime } from "../../../../lib/auth-runtime"
import { createBranch, listBranches, recordAuditLog } from "@petora/core"

export const runtime = "nodejs"

const createSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    code: z.string().trim().min(1).max(20),
    address: z.string().trim().max(500).optional(),
    contact: z.string().trim().max(120).optional(),
    timezone: z.string().trim().max(64).optional()
  })
  .strict()

export async function GET(request: NextRequest) {
  const auth = await requireStaffPermission(request, "settings.manage")
  if ("response" in auth) return auth.response
  try {
    const { db } = getAuthRuntime()
    const branches = await listBranches(db, auth.ctx.organizationId)
    return NextResponse.json({ branches })
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireStaffPermission(request, "settings.manage", { requireOrigin: true })
  if ("response" in auth) return auth.response
  const body = createSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  try {
    const { db } = getAuthRuntime()
    const branch = await createBranch(db, auth.ctx.organizationId, body.data)
    await recordAuditLog(db, {
      organizationId: auth.ctx.organizationId,
      actorId: auth.ctx.userId,
      action: "branch.created",
      entityType: "branch",
      entityId: branch.id,
      after: { name: branch.name, code: branch.code }
    })
    return NextResponse.json({ branch }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
