import { and, eq, inArray, isNull } from "drizzle-orm"
import type { Database } from "@petora/db"
import { schema } from "@petora/db"
import type { Actor, ActorGrant, DataScope } from "@petora/rbac"

export async function loadActor(
  db: Database,
  userId: string,
  realm: "staff" | "customer"
): Promise<{ actor: Actor; organizationId: string | null } | null> {
  const [user] = await db
    .select({ id: schema.users.id, realm: schema.users.realm })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.id, userId),
        eq(schema.users.realm, realm),
        eq(schema.users.isActive, true),
        isNull(schema.users.deletedAt)
      )
    )
    .limit(1)
  if (!user) return null

  if (realm === "customer") {
    return { actor: { userId: user.id, realm, grants: [] }, organizationId: null }
  }

  const assignments = await db
    .select({
      roleId: schema.userRoleAssignments.roleId,
      scope: schema.userRoleAssignments.scope,
      branchIds: schema.userRoleAssignments.branchIds,
      organizationId: schema.roles.organizationId,
      limits: schema.roles.limits
    })
    .from(schema.userRoleAssignments)
    .innerJoin(schema.roles, eq(schema.userRoleAssignments.roleId, schema.roles.id))
    .where(and(eq(schema.userRoleAssignments.userId, userId), isNull(schema.roles.deletedAt)))

  const roleIds = assignments.map((a) => a.roleId)
  const rolePerms =
    roleIds.length === 0
      ? []
      : await db
          .select({
            roleId: schema.rolePermissions.roleId,
            permissionKey: schema.rolePermissions.permissionKey
          })
          .from(schema.rolePermissions)
          .where(inArray(schema.rolePermissions.roleId, roleIds))

  const permsByRole = new Map<string, string[]>()
  for (const rp of rolePerms) {
    const arr = permsByRole.get(rp.roleId) ?? []
    arr.push(rp.permissionKey)
    permsByRole.set(rp.roleId, arr)
  }

  const grants: ActorGrant[] = assignments.map((a) => ({
    roleId: a.roleId,
    scope: a.scope as DataScope,
    branchIds: Array.isArray(a.branchIds) ? (a.branchIds as string[]) : [],
    permissions: permsByRole.get(a.roleId) ?? [],
    limits: (a.limits as ActorGrant["limits"]) ?? undefined
  }))

  const overrides = await db
    .select({
      permission: schema.userPermissionOverrides.permissionKey,
      effect: schema.userPermissionOverrides.effect
    })
    .from(schema.userPermissionOverrides)
    .where(eq(schema.userPermissionOverrides.userId, userId))

  const organizationId = assignments[0]?.organizationId ?? null
  return {
    actor: {
      userId: user.id,
      realm,
      grants,
      overrides: overrides.map((o) => ({
        permission: o.permission,
        effect: o.effect as "grant" | "deny"
      }))
    },
    organizationId
  }
}
