import { and, eq, isNull } from "drizzle-orm"
import type { Database } from "@petora/db"
import { schema } from "@petora/db"

export async function getSetting(
  db: Database,
  organizationId: string,
  key: string,
  branchId?: string | null
): Promise<unknown | undefined> {
  const rows = await db
    .select({ value: schema.settings.value })
    .from(schema.settings)
    .where(
      and(
        eq(schema.settings.organizationId, organizationId),
        eq(schema.settings.key, key),
        branchId ? eq(schema.settings.branchId, branchId) : isNull(schema.settings.branchId)
      )
    )
    .limit(1)
  return rows[0]?.value
}

export async function setSetting(
  db: Database,
  organizationId: string,
  key: string,
  value: unknown,
  branchId?: string | null
): Promise<void> {
  const existing = await db
    .select({ id: schema.settings.id })
    .from(schema.settings)
    .where(
      and(
        eq(schema.settings.organizationId, organizationId),
        eq(schema.settings.key, key),
        branchId ? eq(schema.settings.branchId, branchId) : isNull(schema.settings.branchId)
      )
    )
    .limit(1)

  if (existing[0]) {
    await db
      .update(schema.settings)
      .set({ value: value as never, updatedAt: new Date() })
      .where(eq(schema.settings.id, existing[0].id))
  } else {
    await db.insert(schema.settings).values({
      organizationId,
      branchId: branchId ?? null,
      key,
      value: value as never
    })
  }
}

export async function getFeatureFlag(
  db: Database,
  organizationId: string,
  key: string
): Promise<{ enabled: boolean; config: unknown } | undefined> {
  const rows = await db
    .select({ enabled: schema.featureFlags.enabled, config: schema.featureFlags.config })
    .from(schema.featureFlags)
    .where(
      and(eq(schema.featureFlags.organizationId, organizationId), eq(schema.featureFlags.key, key))
    )
    .limit(1)
  return rows[0]
}

export async function setFeatureFlag(
  db: Database,
  organizationId: string,
  key: string,
  enabled: boolean,
  config?: unknown
): Promise<void> {
  const existing = await db
    .select({ id: schema.featureFlags.id })
    .from(schema.featureFlags)
    .where(
      and(eq(schema.featureFlags.organizationId, organizationId), eq(schema.featureFlags.key, key))
    )
    .limit(1)

  if (existing[0]) {
    await db
      .update(schema.featureFlags)
      .set({ enabled, config: (config ?? null) as never, updatedAt: new Date() })
      .where(eq(schema.featureFlags.id, existing[0].id))
  } else {
    await db.insert(schema.featureFlags).values({
      organizationId,
      key,
      enabled,
      config: (config ?? null) as never
    })
  }
}
