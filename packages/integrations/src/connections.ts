import { and, eq, isNull } from "drizzle-orm"
import type { Database } from "@petora/db"
import { schema } from "@petora/db"
import { decryptCredentials, encryptCredentials, maskSecret } from "./crypto"
import { getAdapter, registerBuiltinAdapters, type AdapterDefinition } from "./registry"

export type SafeConnection = {
  id: string
  organizationId: string
  adapterKey: string
  name: string
  config: Record<string, unknown>
  environment: "sandbox" | "production"
  isActive: boolean
  lastTestAt: Date | null
  lastTestOk: boolean | null
  hasCredentials: boolean
  credentialFields: { key: string; stored: boolean }[]
  createdAt: Date
  updatedAt: Date
}

function toSafe(
  row: typeof schema.integrationConnections.$inferSelect,
  adapter: AdapterDefinition | undefined
): SafeConnection {
  const credKeys = adapter?.credentialFields.map((f) => f.key) ?? []
  return {
    id: row.id,
    organizationId: row.organizationId,
    adapterKey: row.adapterKey,
    name: row.name,
    config: (row.config ?? {}) as Record<string, unknown>,
    environment: row.environment as "sandbox" | "production",
    isActive: row.isActive,
    lastTestAt: row.lastTestAt,
    lastTestOk: row.lastTestOk,
    hasCredentials: !!row.credentialsEnc,
    credentialFields: credKeys.map((key) => ({ key, stored: !!row.credentialsEnc })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

export async function listConnections(
  db: Database,
  organizationId: string
): Promise<SafeConnection[]> {
  registerBuiltinAdapters()
  const rows = await db
    .select()
    .from(schema.integrationConnections)
    .where(
      and(
        eq(schema.integrationConnections.organizationId, organizationId),
        isNull(schema.integrationConnections.deletedAt)
      )
    )
  return rows.map((r) => toSafe(r, getAdapter(r.adapterKey)))
}

export type UpsertConnectionInput = {
  organizationId: string
  adapterKey: string
  name: string
  config?: Record<string, unknown>
  credentials?: Record<string, unknown>
  environment?: "sandbox" | "production"
  isActive?: boolean
}

export async function createConnection(
  db: Database,
  input: UpsertConnectionInput,
  encryptionKey: Buffer
): Promise<SafeConnection> {
  registerBuiltinAdapters()
  const adapter = getAdapter(input.adapterKey)
  if (!adapter) throw new Error("Unknown adapter")

  const [inserted] = await db
    .insert(schema.integrationConnections)
    .values({
      organizationId: input.organizationId,
      adapterKey: input.adapterKey,
      name: input.name.trim(),
      config: (input.config ?? {}) as never,
      credentialsEnc: input.credentials
        ? encryptCredentials(input.credentials, encryptionKey, input.organizationId)
        : null,
      environment: input.environment ?? "sandbox",
      isActive: input.isActive ?? false
    })
    .returning()
  if (!inserted) throw new Error("Failed to create connection")
  return toSafe(inserted, adapter)
}

export async function updateConnection(
  db: Database,
  id: string,
  organizationId: string,
  patch: Partial<UpsertConnectionInput>,
  encryptionKey: Buffer
): Promise<SafeConnection | null> {
  registerBuiltinAdapters()
  const [existing] = await db
    .select()
    .from(schema.integrationConnections)
    .where(
      and(
        eq(schema.integrationConnections.id, id),
        eq(schema.integrationConnections.organizationId, organizationId),
        isNull(schema.integrationConnections.deletedAt)
      )
    )
    .limit(1)
  if (!existing) return null
  const adapter = getAdapter(existing.adapterKey)

  let credentialsEnc = existing.credentialsEnc
  if (patch.credentials && Object.keys(patch.credentials).length > 0) {
    let merged: Record<string, unknown> = {}
    if (existing.credentialsEnc) {
      try {
        merged = decryptCredentials(existing.credentialsEnc, encryptionKey, organizationId)
      } catch {
        merged = {}
      }
    }
    // Only overwrite keys explicitly provided and non-empty (allow keeping stored secrets)
    for (const [k, v] of Object.entries(patch.credentials)) {
      if (v === undefined || v === null) continue
      if (typeof v === "string" && v.trim() === maskSecret("") && existing.credentialsEnc) continue
      merged[k] = v
    }
    credentialsEnc = encryptCredentials(merged, encryptionKey, organizationId)
  }

  const [updated] = await db
    .update(schema.integrationConnections)
    .set({
      name: patch.name?.trim() ?? existing.name,
      config: (patch.config ?? (existing.config as Record<string, unknown>)) as never,
      environment: patch.environment ?? (existing.environment as "sandbox" | "production"),
      isActive: patch.isActive ?? existing.isActive,
      credentialsEnc,
      updatedAt: new Date()
    })
    .where(eq(schema.integrationConnections.id, id))
    .returning()
  return updated ? toSafe(updated, adapter) : null
}

export async function deleteConnection(
  db: Database,
  id: string,
  organizationId: string
): Promise<boolean> {
  const rows = await db
    .update(schema.integrationConnections)
    .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(schema.integrationConnections.id, id),
        eq(schema.integrationConnections.organizationId, organizationId),
        isNull(schema.integrationConnections.deletedAt)
      )
    )
    .returning({ id: schema.integrationConnections.id })
  return rows.length > 0
}

export async function getDecryptedCredentials(
  db: Database,
  id: string,
  organizationId: string,
  encryptionKey: Buffer
): Promise<Record<string, unknown> | null> {
  const [row] = await db
    .select({ credentialsEnc: schema.integrationConnections.credentialsEnc })
    .from(schema.integrationConnections)
    .where(
      and(
        eq(schema.integrationConnections.id, id),
        eq(schema.integrationConnections.organizationId, organizationId),
        isNull(schema.integrationConnections.deletedAt)
      )
    )
    .limit(1)
  if (!row?.credentialsEnc) return null
  return decryptCredentials(row.credentialsEnc, encryptionKey, organizationId)
}
