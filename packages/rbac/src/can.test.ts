import { describe, it, expect } from "vitest"
import { PERMISSION_CATALOG, isPermissionKey, listModules } from "./permissions"
import { can, accessibleBranchIds, effectiveLimits, checkAmountLimit, checkDiscountLimit, type Actor } from "./can"
import { BUILTIN_ROLES, resolveBuiltinPermissions } from "./builtin-roles"

function staff(overrides?: Partial<Actor>): Actor {
  return {
    userId: "u1",
    realm: "staff",
    grants: [],
    ...overrides
  }
}

const BR_A = "branch-a"
const BR_B = "branch-b"

describe("permission catalog", () => {
  it("has unique keys in modul.sumber.aksi format", () => {
    const keys = PERMISSION_CATALOG.map((d) => d.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const k of keys) expect(k).toMatch(/^[a-z_]+(\.[a-z_]+){1,3}$/)
  })
  it("rejects unknown permission keys", () => {
    expect(isPermissionKey("pos.sale.create")).toBe(true)
    expect(isPermissionKey("pos.sale.delete_everything")).toBe(false)
  })
})

describe("can()", () => {
  const cashier: Actor = staff({
    grants: [
      {
        roleId: "cashier",
        scope: "assigned_branches",
        branchIds: [BR_A],
        permissions: resolveBuiltinPermissions("cashier")
      }
    ]
  })
  const owner: Actor = staff({
    userId: "owner1",
    grants: [{ roleId: "owner", scope: "all_branches", branchIds: [], permissions: resolveBuiltinPermissions("owner") }]
  })

  it("denies unknown permission even to owner", () => {
    expect(can({ actor: owner, permission: "not.a.permission" })).toBe(false)
  })
  it("grants owner everything everywhere", () => {
    expect(can({ actor: owner, permission: "settings.manage", resource: { branchId: BR_B } })).toBe(true)
  })
  it("scopes cashier to assigned branch only", () => {
    expect(can({ actor: cashier, permission: "pos.sale.create", resource: { branchId: BR_A } })).toBe(true)
    expect(can({ actor: cashier, permission: "pos.sale.create", resource: { branchId: BR_B } })).toBe(false)
  })
  it("denies cashier high-risk actions", () => {
    expect(can({ actor: cashier, permission: "pos.sale.void", resource: { branchId: BR_A } })).toBe(false)
    expect(can({ actor: cashier, permission: "integration.config.manage" })).toBe(false)
  })
  it("override deny beats role grant; override grant fills gap", () => {
    const denied: Actor = staff({
      grants: cashier.grants,
      overrides: [{ permission: "pos.sale.create", effect: "deny" }]
    })
    expect(can({ actor: denied, permission: "pos.sale.create", resource: { branchId: BR_A } })).toBe(false)

    const granted: Actor = staff({
      grants: cashier.grants,
      overrides: [{ permission: "pos.sale.void", effect: "grant" }]
    })
    expect(can({ actor: granted, permission: "pos.sale.void", resource: { branchId: BR_B } })).toBe(true)
  })
  it("self_only requires matching ownerId", () => {
    const self: Actor = staff({
      grants: [{ roleId: "r", scope: "self_only", branchIds: [], permissions: ["audit.log.view"] }]
    })
    expect(can({ actor: self, permission: "audit.log.view", resource: { ownerId: "u1" } })).toBe(true)
    expect(can({ actor: self, permission: "audit.log.view", resource: { ownerId: "other" } })).toBe(false)
    expect(can({ actor: self, permission: "audit.log.view" })).toBe(false)
  })
})

describe("accessibleBranchIds()", () => {
  it("null = all branches for all_branches scope", () => {
    const actor: Actor = staff({ grants: [{ roleId: "finance", scope: "all_branches", branchIds: [], permissions: ["finance.report.view"] }] })
    expect(accessibleBranchIds(actor, "finance.report.view")).toBeNull()
  })
  it("returns assigned branches for scoped role", () => {
    const actor: Actor = staff({ grants: [{ roleId: "cashier", scope: "assigned_branches", branchIds: [BR_A], permissions: ["pos.sale.create"] }] })
    expect(accessibleBranchIds(actor, "pos.sale.create")).toEqual([BR_A])
  })
  it("empty when permission not held", () => {
    const actor: Actor = staff({ grants: [{ roleId: "cashier", scope: "assigned_branches", branchIds: [BR_A], permissions: ["pos.sale.create"] }] })
    expect(accessibleBranchIds(actor, "medical.record.edit")).toEqual([])
  })
})

describe("numeric limits", () => {
  const limited: Actor = staff({
    grants: [
      {
        roleId: "cashier",
        scope: "assigned_branches",
        branchIds: [BR_A],
        permissions: ["pos.sale.create"],
        limits: { maxDiscountPercent: 10, maxDiscountAmount: 50000 }
      },
      {
        roleId: "other",
        scope: "assigned_branches",
        branchIds: [BR_A],
        permissions: [],
        limits: { maxDiscountPercent: 20 }
      }
    ]
  })

  it("merges strictest limits across grants", () => {
    expect(effectiveLimits(limited).maxDiscountPercent).toBe(10)
  })
  it("discount within both caps passes", () => {
    expect(checkDiscountLimit(limited, 10, 50000).ok).toBe(true)
  })
  it("percent over cap requires approval", () => {
    const r = checkDiscountLimit(limited, 11, 1000)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe("percent")
  })
  it("amount over cap requires approval", () => {
    const r = checkDiscountLimit(limited, 5, 60000)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe("amount")
  })
  it("null cap means unlimited", () => {
    expect(checkAmountLimit(limited, "maxRefundAmount", 999_999_999).ok).toBe(true)
  })
})

describe("builtin roles", () => {
  it("every role references only catalog permissions", () => {
    for (const role of BUILTIN_ROLES) {
      for (const key of resolveBuiltinPermissions(role.key)) {
        expect(isPermissionKey(key)).toBe(true)
      }
    }
  })
  it("owner is locked and has the full catalog", () => {
    const owner = BUILTIN_ROLES.find((r) => r.key === "owner")
    expect(owner?.locked).toBe(true)
    expect(resolveBuiltinPermissions("owner").length).toBe(PERMISSION_CATALOG.length)
  })
  it("covers all documented modules", () => {
    const modules = new Set(listModules())
    for (const m of ["pos", "inventory", "medical", "operations", "master", "finance", "platform"]) {
      expect(modules.has(m)).toBe(true)
    }
  })
})
