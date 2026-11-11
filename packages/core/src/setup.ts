import { eq, sql } from "drizzle-orm"
import type { Database } from "@petora/db"
import { schema } from "@petora/db"
import { hashPassword } from "@petora/auth"
import { seedBuiltinRolesForOrganization } from "@petora/db"

export type SetupStatus = {
  initialized: boolean
  hasOrganization: boolean
  hasOwner: boolean
}

export async function getSetupStatus(db: Database): Promise<SetupStatus> {
  const org = await db.select({ id: schema.organization.id }).from(schema.organization).limit(1)
  const hasOrganization = org.length > 0
  if (!hasOrganization) return { initialized: false, hasOrganization: false, hasOwner: false }

  const ownerRole = await db
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .innerJoin(schema.userRoleAssignments, eq(schema.userRoleAssignments.roleId, schema.roles.id))
    .where(eq(schema.roles.isOwner, true))
    .limit(1)

  const initialized = ownerRole.length > 0
  return { initialized, hasOrganization, hasOwner: ownerRole.length > 0 }
}

export type InitializeSetupInput = {
  organizationName: string
  organizationCode?: string
  branchName: string
  branchCode?: string
  branchAddress?: string
  branchContact?: string
  timezone?: string
  locale?: string
  ownerName: string
  ownerEmail?: string
  ownerPhone?: string
  ownerPassword: string
}

export type InitializeSetupResult = {
  organizationId: string
  branchId: string
  ownerUserId: string
}

function slugCode(value: string, fallback: string): string {
  const s = value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20)
  return s || fallback
}

export async function initializeSetup(
  db: Database,
  input: InitializeSetupInput
): Promise<InitializeSetupResult> {
  const status = await getSetupStatus(db)
  if (status.initialized) throw new Error("Setup already completed")

  const orgCode = input.organizationCode?.trim() || slugCode(input.organizationName, "ORG")
  const branchCode = input.branchCode?.trim() || slugCode(input.branchName, "MAIN")
  const timezone = input.timezone?.trim() || "Asia/Jakarta"
  const locale = input.locale?.trim() || "id"
  const passwordHash = await hashPassword(input.ownerPassword)

  return db.transaction(async (tx) => {
    const [org] = await tx
      .insert(schema.organization)
      .values({ name: input.organizationName.trim(), code: orgCode })
      .returning({ id: schema.organization.id })
    if (!org) throw new Error("Failed to create organization")

    const [branch] = await tx
      .insert(schema.branches)
      .values({
        organizationId: org.id,
        name: input.branchName.trim(),
        code: branchCode,
        address: input.branchAddress?.trim() || null,
        contact: input.branchContact?.trim() || null,
        timezone
      })
      .returning({ id: schema.branches.id })
    if (!branch) throw new Error("Failed to create branch")

    await seedBuiltinRolesForOrganization(tx as unknown as Database, org.id)

    const [ownerRole] = await tx
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(sql`${schema.roles.organizationId} = ${org.id} and ${schema.roles.key} = 'owner'`)
      .limit(1)
    if (!ownerRole) throw new Error("Owner role not seeded")

    const [owner] = await tx
      .insert(schema.users)
      .values({
        realm: "staff",
        email: input.ownerEmail?.trim().toLowerCase() || null,
        phone: input.ownerPhone?.trim() || null,
        passwordHash,
        name: input.ownerName.trim(),
        isActive: true,
        emailVerified: false,
        phoneVerified: false
      })
      .returning({ id: schema.users.id })
    if (!owner) throw new Error("Failed to create owner user")

    await tx.insert(schema.userRoleAssignments).values({
      userId: owner.id,
      roleId: ownerRole.id,
      scope: "all_branches",
      branchIds: []
    })

    await tx.insert(schema.settings).values([
      {
        organizationId: org.id,
        branchId: null,
        key: "locale.default",
        value: locale as never
      },
      {
        organizationId: org.id,
        branchId: null,
        key: "timezone.default",
        value: timezone as never
      },
      {
        organizationId: org.id,
        branchId: null,
        key: "setup.completed",
        value: true as never
      }
    ])

    await tx.insert(schema.featureFlags).values({
      organizationId: org.id,
      key: "commission.enabled",
      enabled: false
    })

    await tx.insert(schema.auditLogs).values({
      organizationId: org.id,
      branchId: branch.id,
      actorId: owner.id,
      action: "setup.completed",
      entityType: "organization",
      entityId: org.id,
      after: { branchId: branch.id, ownerUserId: owner.id } as never
    })

    return { organizationId: org.id, branchId: branch.id, ownerUserId: owner.id }
  })
}
