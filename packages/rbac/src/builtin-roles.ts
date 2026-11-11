/**
 * Role bawaan PETORA INDONESIA (AGENT.md 6.3) — template seed, dapat diubah/diklon dari UI.
 * Matriks mengikuti docs/04-permissions.md. Kunci role stabil (slug) karena dipakai saat seed.
 */

import { PERMISSION_CATALOG } from "./permissions"

export interface BuiltinRoleDef {
  /** Slug stabil, mis. `kasir`. */
  key: string
  nameId: string
  nameEn: string
  /** Cakupan data default penugasan. */
  scope: "all_branches" | "assigned_branches" | "self_only"
  /**
   * Permission milik role. `"*"` = semua permission katalog (hanya Owner/Super Admin).
   * Owner bersifat terkunci: tidak dapat dihapus atau dikurangi permission-nya.
   */
  permissions: readonly string[] | "*"
  locked: boolean
}

const ALL_KEYS = PERMISSION_CATALOG.map((d) => d.key)

/** Peran operasional dasar yang dimiliki hampir semua staf front-line. */
const BASE: readonly string[] = ["inventory.stock.view"]

export const BUILTIN_ROLES: readonly BuiltinRoleDef[] = [
  {
    key: "owner",
    nameId: "Owner",
    nameEn: "Owner",
    scope: "all_branches",
    permissions: "*",
    locked: true
  },
  {
    key: "super_admin",
    nameId: "Super Admin",
    nameEn: "Super Admin",
    scope: "all_branches",
    // Semua kecuali aksi yang secara kebijakan eksklusif Owner bila diperlukan;
    // saat ini identik dengan katalog penuh (lihat catatan di docs/04).
    permissions: ALL_KEYS,
    locked: false
  },
  {
    key: "branch_manager",
    nameId: "Manajer Cabang",
    nameEn: "Branch Manager",
    scope: "assigned_branches",
    permissions: [
      ...BASE,
      "pos.sale.create",
      "pos.sale.void",
      "pos.sale.refund",
      "pos.discount.override",
      "pos.payment.receive",
      "pos.shift.open",
      "pos.shift.close",
      "inventory.stock.adjust",
      "inventory.purchase.order",
      "inventory.goods.receipt",
      "medical.record.view",
      "medical.prescription.create",
      "vaccination.manage",
      "appointment.manage",
      "grooming.job.manage",
      "boarding.manage",
      "customer.manage",
      "product.manage",
      "finance.report.view",
      "commission.report.view",
      "audit.log.view"
    ],
    locked: false
  },
  {
    key: "cashier",
    nameId: "Kasir",
    nameEn: "Cashier",
    scope: "assigned_branches",
    permissions: [...BASE, "pos.sale.create", "pos.payment.receive", "pos.shift.open", "pos.shift.close"],
    locked: false
  },
  {
    key: "receptionist",
    nameId: "Resepsionis",
    nameEn: "Receptionist",
    scope: "assigned_branches",
    permissions: [...BASE, "appointment.manage", "customer.manage", "pos.sale.create", "pos.payment.receive", "boarding.manage"],
    locked: false
  },
  {
    key: "vet",
    nameId: "Dokter Hewan",
    nameEn: "Veterinarian",
    scope: "assigned_branches",
    permissions: [
      ...BASE,
      "medical.record.view",
      "medical.record.edit",
      "medical.record.view_internal_notes",
      "medical.record.finalize",
      "medical.prescription.create",
      "vaccination.manage",
      "appointment.manage",
      "customer.manage"
    ],
    locked: false
  },
  {
    key: "nurse",
    nameId: "Paramedis/Perawat",
    nameEn: "Vet Nurse",
    scope: "assigned_branches",
    permissions: ["medical.record.view", "appointment.manage", ...BASE],
    locked: false
  },
  {
    key: "groomer",
    nameId: "Groomer",
    nameEn: "Groomer",
    scope: "assigned_branches",
    permissions: ["grooming.job.manage", "appointment.manage", ...BASE],
    locked: false
  },
  {
    key: "boarding_staff",
    nameId: "Petugas Penitipan",
    nameEn: "Boarding Staff",
    scope: "assigned_branches",
    permissions: ["boarding.manage", "appointment.manage", ...BASE],
    locked: false
  },
  {
    key: "warehouse_admin",
    nameId: "Admin Gudang",
    nameEn: "Warehouse Admin",
    scope: "assigned_branches",
    permissions: [...BASE, "inventory.stock.adjust", "inventory.purchase.order", "inventory.goods.receipt", "product.manage"],
    locked: false
  },
  {
    key: "finance",
    nameId: "Keuangan/Akuntan",
    nameEn: "Finance/Accountant",
    scope: "all_branches",
    permissions: ["finance.report.view", "finance.journal.post", "commission.report.view", ...BASE],
    locked: false
  }
] as const

export function getBuiltinRole(key: string): BuiltinRoleDef | undefined {
  return builtinRoleMap[key]
}

const builtinRoleMap: Record<string, BuiltinRoleDef> = Object.fromEntries(BUILTIN_ROLES.map((r) => [r.key, r]))

/** Resolve permission sebuah role bawaan (termasuk wildcard `"*"`). */
export function resolveBuiltinPermissions(roleKey: string): string[] {
  const def = builtinRoleMap[roleKey]
  if (!def) return []
  return def.permissions === "*" ? [...ALL_KEYS] : [...def.permissions]
}
