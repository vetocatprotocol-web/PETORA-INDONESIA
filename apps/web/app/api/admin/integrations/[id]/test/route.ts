import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { requireStaffPermission } from "../../../../../../lib/admin-api"
import { getAuthRuntime, getEncryptionMasterKey } from "../../../../../../lib/auth-runtime"
import { getAdapter, getDecryptedCredentials, registerBuiltinAdapters } from "@petora/integrations"
import { recordAuditLog } from "@petora/core"
import { schema } from "@petora/db"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: Ctx) {
  const { id } = await context.params
  const auth = await requireStaffPermission(request, "integration.config.manage", {
    requireOrigin: true
  })
  if ("response" in auth) return auth.response
  try {
    const { db } = getAuthRuntime()
    registerBuiltinAdapters()
    const [row] = await db
      .select()
      .from(schema.integrationConnections)
      .where(
        and(
          eq(schema.integrationConnections.id, id),
          eq(schema.integrationConnections.organizationId, auth.ctx.organizationId),
          isNull(schema.integrationConnections.deletedAt)
        )
      )
      .limit(1)
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 })

    const adapter = getAdapter(row.adapterKey)
    if (!adapter) return NextResponse.json({ error: "unknown_adapter" }, { status: 400 })

    const config = (row.config ?? {}) as Record<string, unknown>
    const missingConfig = adapter.configFields
      .filter((f) => f.required)
      .filter((f) => {
        const v = config[f.key]
        return v === undefined || v === null || v === ""
      })
      .map((f) => f.key)

    let creds: Record<string, unknown> | null = null
    if (row.credentialsEnc) {
      try {
        creds = await getDecryptedCredentials(
          db,
          id,
          auth.ctx.organizationId,
          getEncryptionMasterKey()
        )
      } catch {
        creds = null
      }
    }
    const missingCredentials = adapter.credentialFields
      .filter((f) => f.required)
      .filter((f) => {
        const v = creds?.[f.key]
        return v === undefined || v === null || v === ""
      })
      .map((f) => f.key)

    const ok = missingConfig.length === 0 && missingCredentials.length === 0
    const result = {
      ok,
      adapterKey: row.adapterKey,
      checkedAt: new Date().toISOString(),
      missingConfig,
      missingCredentials,
      note: ok
        ? "Konfigurasi dan kredensial wajib lengkap. Tes koneksi live ke provider akan ditambahkan per adapter."
        : "Konfigurasi/kredensial wajib belum lengkap."
    }

    await db
      .update(schema.integrationConnections)
      .set({ lastTestAt: new Date(), lastTestOk: ok, updatedAt: new Date() })
      .where(eq(schema.integrationConnections.id, id))

    await recordAuditLog(db, {
      organizationId: auth.ctx.organizationId,
      actorId: auth.ctx.userId,
      action: "integration.connection.tested",
      entityType: "integration_connection",
      entityId: id,
      after: { ok, missingConfig, missingCredentials }
    })

    return NextResponse.json({ result })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
