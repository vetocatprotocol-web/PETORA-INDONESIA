import { eq } from "drizzle-orm"
import type { Database } from "@petora/db"
import { schema } from "@petora/db"

export type IngestWebhookInput = {
  connectionId: string
  providerEventId?: string | null
  idempotencyKey: string
  type: string
  payload: unknown
}

export type IngestResult =
  { status: "received"; eventId: string } | { status: "duplicate"; eventId: string }

export async function ingestWebhookEvent(
  db: Database,
  input: IngestWebhookInput
): Promise<IngestResult> {
  const existing = await db
    .select({ id: schema.webhookEvents.id })
    .from(schema.webhookEvents)
    .where(eq(schema.webhookEvents.idempotencyKey, input.idempotencyKey))
    .limit(1)
  if (existing[0]) {
    return { status: "duplicate", eventId: existing[0].id }
  }

  try {
    const [inserted] = await db
      .insert(schema.webhookEvents)
      .values({
        connectionId: input.connectionId,
        providerEventId: input.providerEventId ?? null,
        idempotencyKey: input.idempotencyKey,
        type: input.type,
        payload: input.payload as never,
        status: "received"
      })
      .returning({ id: schema.webhookEvents.id })
    if (!inserted) throw new Error("Failed to ingest webhook")
    return { status: "received", eventId: inserted.id }
  } catch (error) {
    // unique violation on idempotency_key => duplicate
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes("unique") || msg.includes("duplicate")) {
      const again = await db
        .select({ id: schema.webhookEvents.id })
        .from(schema.webhookEvents)
        .where(eq(schema.webhookEvents.idempotencyKey, input.idempotencyKey))
        .limit(1)
      if (again[0]) return { status: "duplicate", eventId: again[0].id }
    }
    throw error
  }
}

export async function markWebhookProcessed(
  db: Database,
  eventId: string,
  status: "done" | "failed" | "ignored_duplicate",
  error?: string | null
): Promise<void> {
  await db
    .update(schema.webhookEvents)
    .set({
      status,
      processedAt: new Date(),
      error: error ?? null
    })
    .where(eq(schema.webhookEvents.id, eventId))
}

export async function listWebhookEvents(
  db: Database,
  connectionId: string,
  limit = 50
): Promise<(typeof schema.webhookEvents.$inferSelect)[]> {
  return db
    .select()
    .from(schema.webhookEvents)
    .where(eq(schema.webhookEvents.connectionId, connectionId))
    .limit(Math.min(Math.max(limit, 1), 200))
}
