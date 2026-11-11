import type { Database } from "@petora/db"
import { schema } from "@petora/db"

export type AuditInput = {
  organizationId?: string | null
  branchId?: string | null
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  before?: unknown
  after?: unknown
  meta?: unknown
  ip?: string | null
}

export async function recordAuditLog(db: Database, input: AuditInput): Promise<void> {
  await db.insert(schema.auditLogs).values({
    organizationId: input.organizationId ?? null,
    branchId: input.branchId ?? null,
    actorId: input.actorId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    before: (input.before ?? null) as never,
    after: (input.after ?? null) as never,
    meta: (input.meta ?? null) as never,
    ip: input.ip ?? null
  })
}
