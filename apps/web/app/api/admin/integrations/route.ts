import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireStaffPermission } from "../../../../lib/admin-api"
import { getAuthRuntime, getEncryptionMasterKey } from "../../../../lib/auth-runtime"
import {
  createConnection,
  listAdapters,
  listConnections,
  registerBuiltinAdapters
} from "@petora/integrations"
import { recordAuditLog } from "@petora/core"

export const runtime = "nodejs"

const createSchema = z
  .object({
    adapterKey: z.string().min(1).max(64),
    name: z.string().trim().min(1).max(120),
    config: z.record(z.unknown()).optional(),
    credentials: z.record(z.unknown()).optional(),
    environment: z.enum(["sandbox", "production"]).optional(),
    isActive: z.boolean().optional()
  })
  .strict()

export async function GET(request: NextRequest) {
  const auth = await requireStaffPermission(request, "integration.config.manage")
  if ("response" in auth) return auth.response
  try {
    const { db } = getAuthRuntime()
    registerBuiltinAdapters()
    const [connections, adapters] = await Promise.all([
      listConnections(db, auth.ctx.organizationId),
      Promise.resolve(listAdapters())
    ])
    return NextResponse.json(
      { connections, adapters },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireStaffPermission(request, "integration.config.manage", {
    requireOrigin: true
  })
  if ("response" in auth) return auth.response
  const body = createSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  try {
    const { db } = getAuthRuntime()
    const key = getEncryptionMasterKey()
    const connection = await createConnection(
      db,
      { organizationId: auth.ctx.organizationId, ...body.data },
      key
    )
    await recordAuditLog(db, {
      organizationId: auth.ctx.organizationId,
      actorId: auth.ctx.userId,
      action: "integration.connection.created",
      entityType: "integration_connection",
      entityId: connection.id,
      after: { adapterKey: connection.adapterKey, name: connection.name }
    })
    return NextResponse.json({ connection }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed"
    if (message === "Unknown adapter")
      return NextResponse.json({ error: "unknown_adapter" }, { status: 400 })
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
