import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { createDb, schema } from "@petora/db"
import { ingestWebhookEvent, markWebhookProcessed } from "@petora/integrations"
import { createHash } from "node:crypto"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ provider: string }> }

const SUPPORTED = new Set(["midtrans", "xendit", "whatsapp", "whatsapp-cloud", "whatsapp-gateway"])

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex")
}

export async function POST(request: NextRequest, context: Ctx) {
  const { provider } = await context.params
  if (!SUPPORTED.has(provider)) {
    return NextResponse.json({ error: "unknown_provider" }, { status: 404 })
  }
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return NextResponse.json({ error: "unavailable" }, { status: 503 })

  const raw = await request.text()
  let payload: unknown = null
  try {
    payload = raw ? JSON.parse(raw) : {}
  } catch {
    payload = { raw }
  }

  const db = createDb(databaseUrl)
  try {
    // Resolve connection: prefer explicit header/query hint, else pick an active connection by adapter family.
    const connectionHint =
      request.headers.get("x-petora-connection-id") ||
      request.nextUrl.searchParams.get("connectionId")
    let connectionId: string | null = null
    let organizationId: string | null = null

    if (connectionHint) {
      const [row] = await db
        .select({
          id: schema.integrationConnections.id,
          organizationId: schema.integrationConnections.organizationId
        })
        .from(schema.integrationConnections)
        .where(
          and(
            eq(schema.integrationConnections.id, connectionHint),
            isNull(schema.integrationConnections.deletedAt)
          )
        )
        .limit(1)
      if (row) {
        connectionId = row.id
        organizationId = row.organizationId
      }
    }

    if (!connectionId) {
      const adapterKey =
        provider === "midtrans"
          ? "midtrans"
          : provider === "xendit"
            ? "xendit"
            : provider === "whatsapp-cloud"
              ? "whatsapp_cloud"
              : provider === "whatsapp-gateway"
                ? "whatsapp_gateway"
                : "whatsapp_cloud"
      const [row] = await db
        .select({
          id: schema.integrationConnections.id,
          organizationId: schema.integrationConnections.organizationId
        })
        .from(schema.integrationConnections)
        .where(
          and(
            eq(schema.integrationConnections.adapterKey, adapterKey),
            eq(schema.integrationConnections.isActive, true),
            isNull(schema.integrationConnections.deletedAt)
          )
        )
        .limit(1)
      if (row) {
        connectionId = row.id
        organizationId = row.organizationId
      }
    }

    if (!connectionId) {
      // Accept but cannot attribute: store is impossible without FK; return 202 to avoid provider retry storms but note.
      return NextResponse.json(
        { received: true, stored: false, reason: "no_connection" },
        { status: 202 }
      )
    }

    // Idempotency: prefer provider event id headers/body hints, else hash of raw body + provider.
    const providerEventId =
      request.headers.get("x-callback-token") ||
      request.headers.get("x-midtrans-signature-key") ||
      (payload && typeof payload === "object" && "event_id" in (payload as any)
        ? String((payload as any).event_id)
        : null) ||
      (payload && typeof payload === "object" && "id" in (payload as any)
        ? String((payload as any).id)
        : null) ||
      null
    const idemKey = sha256Hex(`${provider}:${connectionId}:${providerEventId ?? raw}`)

    const result = await ingestWebhookEvent(db, {
      connectionId,
      providerEventId,
      idempotencyKey: idemKey,
      type: `${provider}.webhook`,
      payload
    })

    if (result.status === "duplicate") {
      await markWebhookProcessed(db, result.eventId, "ignored_duplicate", null).catch(() => {})
      return NextResponse.json(
        { received: true, duplicate: true, eventId: result.eventId },
        { status: 200 }
      )
    }

    // Actual provider signature verification & business handling is implemented per-module later.
    // Mark received (not processed) so worker/handlers can pick up.
    return NextResponse.json(
      { received: true, eventId: result.eventId, organizationId },
      { status: 202 }
    )
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  } finally {
    await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end()
  }
}

// Some providers verify endpoint via GET
export async function GET() {
  return NextResponse.json({ ok: true })
}
