import { eq, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { BUILTIN_ROLES, PERMISSION_CATALOG, resolveBuiltinPermissions } from "@petora/rbac"
import * as schema from "./schema"

export type Database = ReturnType<typeof drizzle<typeof schema>>

export type SeedResult = {
  permissionsUpserted: number
  systemRolesSynced: number
}

export async function seedCatalog(db: Database): Promise<SeedResult> {
  const now = new Date()

  await db
    .insert(schema.permissions)
    .values(
      PERMISSION_CATALOG.map((p) => ({
        key: p.key,
        module: p.module,
        descriptionId: p.descriptionId,
        descriptionEn: p.descriptionEn,
        risk: p.risk,
        updatedAt: now
      }))
    )
    .onConflictDoUpdate({
      target: schema.permissions.key,
      set: {
        module: sql`excluded.module`,
        descriptionId: sql`excluded.description_id`,
        descriptionEn: sql`excluded.description_en`,
        risk: sql`excluded.risk`,
        updatedAt: now
      }
    })

  const orgs = await db.select({ id: schema.organization.id }).from(schema.organization)
  let systemRolesSynced = 0
  for (const org of orgs) {
    systemRolesSynced += await seedBuiltinRolesForOrganization(db, org.id)
  }
  return { permissionsUpserted: PERMISSION_CATALOG.length, systemRolesSynced }
}

export async function seedBuiltinRolesForOrganization(
  db: Database,
  organizationId: string
): Promise<number> {
  const now = new Date()
  let synced = 0
  for (const def of BUILTIN_ROLES) {
    const perms = resolveBuiltinPermissions(def.key)
    const existing = await db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(
        sql`${schema.roles.organizationId} = ${organizationId} and ${schema.roles.key} = ${def.key}`
      )
      .limit(1)

    let roleId: string
    if (existing[0]) {
      roleId = existing[0].id
      await db
        .update(schema.roles)
        .set({
          name: def.nameId,
          isSystem: true,
          isOwner: def.locked && def.key === "owner",
          defaultScope: def.scope,
          updatedAt: now
        })
        .where(eq(schema.roles.id, roleId))
      await db.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, roleId))
    } else {
      const inserted = await db
        .insert(schema.roles)
        .values({
          organizationId,
          key: def.key,
          name: def.nameId,
          isSystem: true,
          isOwner: def.locked && def.key === "owner",
          defaultScope: def.scope,
          updatedAt: now
        })
        .returning({ id: schema.roles.id })
      roleId = inserted[0]!.id
    }

    if (perms.length > 0) {
      await db.insert(schema.rolePermissions).values(
        perms.map((permissionKey) => ({
          roleId,
          permissionKey,
          updatedAt: now
        }))
      )
    }
    synced++
  }
  return synced
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is required")
  const pool = new Pool({ connectionString: databaseUrl })
  const db = drizzle(pool, { schema })
  try {
    const result = await seedCatalog(db)
    console.log(
      `Seed complete: permissions=${result.permissionsUpserted}, systemRolesSynced=${result.systemRolesSynced}`
    )
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
