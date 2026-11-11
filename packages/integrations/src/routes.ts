import { and, eq, isNull } from "drizzle-orm"
import type { Database } from "@petora/db"
import { schema } from "@petora/db"

export type IntegrationRouteInput = {
  organizationId: string
  branchId?: string | null
  purpose: string
  connectionId: string
}

export async function listIntegrationRoutes(db: Database, organizationId: string) {
  return db
    .select({
      id: schema.integrationRoutes.id,
      organizationId: schema.integrationRoutes.organizationId,
      branchId: schema.integrationRoutes.branchId,
      purpose: schema.integrationRoutes.purpose,
      connectionId: schema.integrationRoutes.connectionId,
      connectionName: schema.integrationConnections.name,
      adapterKey: schema.integrationConnections.adapterKey
    })
    .from(schema.integrationRoutes)
    .innerJoin(
      schema.integrationConnections,
      eq(schema.integrationRoutes.connectionId, schema.integrationConnections.id)
    )
    .where(eq(schema.integrationRoutes.organizationId, organizationId))
}

export async function setIntegrationRoute(
  db: Database,
  input: IntegrationRouteInput
): Promise<{ id: string }> {
  // Upsert by (org, branch, purpose)
  const existing = await db
    .select({ id: schema.integrationRoutes.id })
    .from(schema.integrationRoutes)
    .where(
      and(
        eq(schema.integrationRoutes.organizationId, input.organizationId),
        input.branchId
          ? eq(schema.integrationRoutes.branchId, input.branchId)
          : isNull(schema.integrationRoutes.branchId),
        eq(schema.integrationRoutes.purpose, input.purpose)
      )
    )
    .limit(1)

  if (existing[0]) {
    const [row] = await db
      .update(schema.integrationRoutes)
      .set({ connectionId: input.connectionId })
      .where(eq(schema.integrationRoutes.id, existing[0].id))
      .returning({ id: schema.integrationRoutes.id })
    return { id: row!.id }
  }

  const [row] = await db
    .insert(schema.integrationRoutes)
    .values({
      organizationId: input.organizationId,
      branchId: input.branchId ?? null,
      purpose: input.purpose.trim(),
      connectionId: input.connectionId
    })
    .returning({ id: schema.integrationRoutes.id })
  return { id: row!.id }
}

export async function deleteIntegrationRoute(
  db: Database,
  organizationId: string,
  routeId: string
): Promise<boolean> {
  const rows = await db
    .delete(schema.integrationRoutes)
    .where(
      and(
        eq(schema.integrationRoutes.id, routeId),
        eq(schema.integrationRoutes.organizationId, organizationId)
      )
    )
    .returning({ id: schema.integrationRoutes.id })
  return rows.length > 0
}

export async function resolveRoutedConnection(
  db: Database,
  organizationId: string,
  purpose: string,
  branchId?: string | null
): Promise<string | null> {
  // Prefer branch-specific route, then org default (branchId null)
  if (branchId) {
    const [specific] = await db
      .select({ connectionId: schema.integrationRoutes.connectionId })
      .from(schema.integrationRoutes)
      .where(
        and(
          eq(schema.integrationRoutes.organizationId, organizationId),
          eq(schema.integrationRoutes.branchId, branchId),
          eq(schema.integrationRoutes.purpose, purpose)
        )
      )
      .limit(1)
    if (specific) return specific.connectionId
  }
  const [fallback] = await db
    .select({ connectionId: schema.integrationRoutes.connectionId })
    .from(schema.integrationRoutes)
    .where(
      and(
        eq(schema.integrationRoutes.organizationId, organizationId),
        isNull(schema.integrationRoutes.branchId),
        eq(schema.integrationRoutes.purpose, purpose)
      )
    )
    .limit(1)
  return fallback?.connectionId ?? null
}
