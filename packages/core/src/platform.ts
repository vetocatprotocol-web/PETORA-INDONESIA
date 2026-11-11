import { and, eq, inArray, isNull } from "drizzle-orm"
import type { Database } from "@petora/db"
import { schema } from "@petora/db"
import { isPermissionKey } from "@petora/rbac"

export async function listBranches(db: Database, organizationId: string) {
  return db
    .select()
    .from(schema.branches)
    .where(
      and(eq(schema.branches.organizationId, organizationId), isNull(schema.branches.deletedAt))
    )
    .orderBy(schema.branches.createdAt)
}

export async function createBranch(
  db: Database,
  organizationId: string,
  input: { name: string; code: string; address?: string; contact?: string; timezone?: string }
) {
  const [row] = await db
    .insert(schema.branches)
    .values({
      organizationId,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      address: input.address?.trim() || null,
      contact: input.contact?.trim() || null,
      timezone: input.timezone?.trim() || "Asia/Jakarta"
    })
    .returning()
  if (!row) throw new Error("Failed to create branch")
  return row
}

export async function updateBranch(
  db: Database,
  organizationId: string,
  id: string,
  patch: { name?: string; address?: string | null; contact?: string | null; timezone?: string }
) {
  const [row] = await db
    .update(schema.branches)
    .set({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.address !== undefined ? { address: patch.address } : {}),
      ...(patch.contact !== undefined ? { contact: patch.contact } : {}),
      ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
      updatedAt: new Date()
    })
    .where(
      and(
        eq(schema.branches.id, id),
        eq(schema.branches.organizationId, organizationId),
        isNull(schema.branches.deletedAt)
      )
    )
    .returning()
  return row ?? null
}

export async function listRoles(db: Database, organizationId: string) {
  const roles = await db
    .select()
    .from(schema.roles)
    .where(and(eq(schema.roles.organizationId, organizationId), isNull(schema.roles.deletedAt)))
    .orderBy(schema.roles.isSystem, schema.roles.name)
  const roleIds = roles.map((r) => r.id)
  const perms =
    roleIds.length === 0
      ? []
      : await db
          .select({
            roleId: schema.rolePermissions.roleId,
            permissionKey: schema.rolePermissions.permissionKey
          })
          .from(schema.rolePermissions)
          .where(inArray(schema.rolePermissions.roleId, roleIds))
  const byRole = new Map<string, string[]>()
  for (const p of perms) {
    const arr = byRole.get(p.roleId) ?? []
    arr.push(p.permissionKey)
    byRole.set(p.roleId, arr)
  }
  return roles.map((r) => ({ ...r, permissions: byRole.get(r.id) ?? [] }))
}

export type CreateRoleInput = {
  key: string
  name: string
  defaultScope?: "all_branches" | "assigned_branches" | "self_only"
  permissions?: string[]
  limits?: Record<string, number | null> | null
}

export async function createRole(db: Database, organizationId: string, input: CreateRoleInput) {
  const permissions = (input.permissions ?? []).filter(isPermissionKey)
  return db.transaction(async (tx) => {
    const [role] = await tx
      .insert(schema.roles)
      .values({
        organizationId,
        key: input.key
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]+/g, "_"),
        name: input.name.trim(),
        isSystem: false,
        isOwner: false,
        defaultScope: input.defaultScope ?? "assigned_branches",
        limits: (input.limits ?? null) as never
      })
      .returning()
    if (!role) throw new Error("Failed to create role")
    if (permissions.length) {
      await tx
        .insert(schema.rolePermissions)
        .values(permissions.map((permissionKey) => ({ roleId: role.id, permissionKey })))
    }
    return { ...role, permissions }
  })
}

export async function cloneRole(
  db: Database,
  organizationId: string,
  sourceRoleId: string,
  input: { key: string; name: string }
) {
  const roles = await listRoles(db, organizationId)
  const source = roles.find((r) => r.id === sourceRoleId)
  if (!source) return null
  return createRole(db, organizationId, {
    key: input.key,
    name: input.name,
    defaultScope: source.defaultScope as CreateRoleInput["defaultScope"],
    permissions: source.permissions,
    limits: (source.limits as Record<string, number | null> | null) ?? undefined
  })
}

export async function updateRole(
  db: Database,
  organizationId: string,
  roleId: string,
  patch: Partial<CreateRoleInput>
) {
  const [existing] = await db
    .select()
    .from(schema.roles)
    .where(
      and(
        eq(schema.roles.id, roleId),
        eq(schema.roles.organizationId, organizationId),
        isNull(schema.roles.deletedAt)
      )
    )
    .limit(1)
  if (!existing) return null
  if (existing.isOwner) throw new Error("Owner role cannot be modified")

  return db.transaction(async (tx) => {
    const [role] = await tx
      .update(schema.roles)
      .set({
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.defaultScope !== undefined ? { defaultScope: patch.defaultScope } : {}),
        ...(patch.limits !== undefined ? { limits: (patch.limits ?? null) as never } : {}),
        updatedAt: new Date()
      })
      .where(eq(schema.roles.id, roleId))
      .returning()
    if (!role) return null
    if (patch.permissions !== undefined) {
      const permissions = patch.permissions.filter(isPermissionKey)
      await tx.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, roleId))
      if (permissions.length) {
        await tx
          .insert(schema.rolePermissions)
          .values(permissions.map((permissionKey) => ({ roleId, permissionKey })))
      }
      return { ...role, permissions }
    }
    const perms = await tx
      .select({ permissionKey: schema.rolePermissions.permissionKey })
      .from(schema.rolePermissions)
      .where(eq(schema.rolePermissions.roleId, roleId))
    return { ...role, permissions: perms.map((p) => p.permissionKey) }
  })
}

export async function listUsers(db: Database, organizationId: string) {
  // Users in org: those assigned to any role in org
  const rows = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      phone: schema.users.phone,
      realm: schema.users.realm,
      isActive: schema.users.isActive
    })
    .from(schema.users)
    .innerJoin(schema.userRoleAssignments, eq(schema.userRoleAssignments.userId, schema.users.id))
    .innerJoin(schema.roles, eq(schema.userRoleAssignments.roleId, schema.roles.id))
    .where(and(eq(schema.roles.organizationId, organizationId), isNull(schema.users.deletedAt)))
  const seen = new Map<string, (typeof rows)[number]>()
  for (const r of rows) seen.set(r.id, r)
  return [...seen.values()]
}

export async function assignUserRole(
  db: Database,
  input: {
    userId: string
    roleId: string
    scope: "all_branches" | "assigned_branches" | "self_only"
    branchIds?: string[]
  }
) {
  await db
    .insert(schema.userRoleAssignments)
    .values({
      userId: input.userId,
      roleId: input.roleId,
      scope: input.scope,
      branchIds: (input.branchIds ?? []) as never
    })
    .onConflictDoUpdate({
      target: [schema.userRoleAssignments.userId, schema.userRoleAssignments.roleId],
      set: { scope: input.scope, branchIds: (input.branchIds ?? []) as never }
    })
}

export async function listUserRoleAssignments(db: Database, organizationId: string) {
  return db
    .select({
      id: schema.userRoleAssignments.id,
      userId: schema.userRoleAssignments.userId,
      roleId: schema.userRoleAssignments.roleId,
      scope: schema.userRoleAssignments.scope,
      branchIds: schema.userRoleAssignments.branchIds,
      roleKey: schema.roles.key,
      roleName: schema.roles.name,
      userName: schema.users.name,
      userEmail: schema.users.email
    })
    .from(schema.userRoleAssignments)
    .innerJoin(schema.roles, eq(schema.userRoleAssignments.roleId, schema.roles.id))
    .innerJoin(schema.users, eq(schema.userRoleAssignments.userId, schema.users.id))
    .where(and(eq(schema.roles.organizationId, organizationId), isNull(schema.users.deletedAt)))
}

export async function removeUserRoleAssignment(
  db: Database,
  organizationId: string,
  assignmentId: string
): Promise<boolean> {
  const [existing] = await db
    .select({ id: schema.userRoleAssignments.id })
    .from(schema.userRoleAssignments)
    .innerJoin(schema.roles, eq(schema.userRoleAssignments.roleId, schema.roles.id))
    .where(
      and(
        eq(schema.userRoleAssignments.id, assignmentId),
        eq(schema.roles.organizationId, organizationId)
      )
    )
    .limit(1)
  if (!existing) return false
  await db.delete(schema.userRoleAssignments).where(eq(schema.userRoleAssignments.id, assignmentId))
  return true
}

export async function listAuditLogs(db: Database, organizationId: string, limit = 100) {
  return db
    .select()
    .from(schema.auditLogs)
    .where(eq(schema.auditLogs.organizationId, organizationId))
    .orderBy(schema.auditLogs.createdAt)
    .limit(Math.min(Math.max(limit, 1), 500))
}
