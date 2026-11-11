import { and, eq, isNull } from "drizzle-orm"
import type { Database } from "@petora/db"
import { schema } from "@petora/db"
import { recordAuditLog, type AuditInput } from "./audit"

export async function resolveStaffOrganizationId(
  db: Database,
  userId: string
): Promise<string | null> {
  const rows = await db
    .select({ organizationId: schema.roles.organizationId })
    .from(schema.userRoleAssignments)
    .innerJoin(schema.roles, eq(schema.userRoleAssignments.roleId, schema.roles.id))
    .where(and(eq(schema.userRoleAssignments.userId, userId), isNull(schema.roles.deletedAt)))
    .limit(1)
  return rows[0]?.organizationId ?? null
}

export async function auditAuthEvent(
  db: Database,
  input: AuditInput & { userId?: string | null }
): Promise<void> {
  let organizationId = input.organizationId ?? null
  if (!organizationId && input.userId) {
    organizationId = await resolveStaffOrganizationId(db, input.userId)
  }
  await recordAuditLog(db, { ...input, organizationId })
}
