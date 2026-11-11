/**
 * Evaluator can() — otorisasi server-side (AGENT.md 4.3, 6.1; docs/04-permissions.md).
 * Aturan:
 *  - Permission tidak dikenal selalu ditolak.
 *  - Override eksplisit pengguna: deny menang atas grant; grant/deny menang atas role.
 *  - Cakupan data per penugasan: all_branches / assigned_branches / self_only.
 *  - Batas numerik per role dievaluasi terpisah (evaluateLimits) karena butuh nilai transaksi.
 */

import { isPermissionKey } from "./permissions"
import type { DataScope, PermissionOverride, RoleLimits } from "./policy"
import { EMPTY_LIMITS } from "./policy"

export interface ActorGrant {
  roleId: string
  scope: DataScope
  /** Cabang tempat role ini diberi (hanya relevan untuk scope assigned_branches). */
  branchIds: string[]
  permissions: string[]
  limits?: Partial<RoleLimits>
}

export interface Actor {
  userId: string
  realm: "staff" | "customer"
  grants: ActorGrant[]
  overrides?: PermissionOverride[]
}

export interface ResourceRef {
  branchId?: string
  ownerId?: string
}

export interface CanInput {
  actor: Actor
  permission: string
  resource?: ResourceRef
}

/** Apakah aktor punya permission (tanpa memedulikan cabang)? */
function hasPermissionEverywhere(actor: Actor, permission: string): boolean {
  return actor.grants.some((g) => g.scope === "all_branches" && g.permissions.includes(permission))
}

function hasPermissionInBranch(actor: Actor, permission: string, branchId: string): boolean {
  return actor.grants.some(
    (g) =>
      (g.scope === "all_branches" ||
        (g.scope === "assigned_branches" && g.branchIds.includes(branchId))) &&
      g.permissions.includes(permission)
  )
}

function hasSelfOnlyPermission(actor: Actor, permission: string): boolean {
  return actor.grants.some((g) => g.scope === "self_only" && g.permissions.includes(permission))
}

/**
 * Keputusan akses. `can()` WAJIB dipanggil di server pada setiap operasi.
 * Untuk sumber ber-cabang, `resource.branchId` harus diisi; tanpa itu hanya granted
 * oleh cakupan all_branches/self_only yang lolos (dipakai mis. untuk daftar cabang itu sendiri).
 */
export function can(input: CanInput): boolean {
  const { actor, permission, resource } = input
  if (!isPermissionKey(permission)) return false

  // Override per pengguna: deny mutlak, grant memberi akses lintas-cabang.
  const overrides = actor.overrides ?? []
  if (overrides.some((o) => o.permission === permission && o.effect === "deny")) return false
  const grantedByOverride = overrides.some(
    (o) => o.permission === permission && o.effect === "grant"
  )
  if (grantedByOverride) return true

  if (hasPermissionEverywhere(actor, permission)) return true

  if (resource?.branchId !== undefined) {
    if (hasPermissionInBranch(actor, permission, resource.branchId)) return true
  }

  if (
    resource?.ownerId !== undefined &&
    resource.ownerId === actor.userId &&
    hasSelfOnlyPermission(actor, permission)
  ) {
    return true
  }
  // self_only tanpa resource owner diketahui: anggap hanya boleh jika sumber milik sendiri
  // (pemanggil wajib mengirim ownerId; bila tidak ada resource, self_only tidak meloloskan).
  return false
}

/** Kumpulkan semua cabang yang dapat diakses aktor untuk sebuah permission. `null` = semua cabang. */
export function accessibleBranchIds(actor: Actor, permission: string): string[] | null {
  if (!isPermissionKey(permission)) return []
  const overrides = actor.overrides ?? []
  if (overrides.some((o) => o.permission === permission && o.effect === "deny")) return []
  if (overrides.some((o) => o.permission === permission && o.effect === "grant")) return null

  const ids = new Set<string>()
  for (const g of actor.grants) {
    if (!g.permissions.includes(permission)) continue
    if (g.scope === "all_branches") return null
    if (g.scope === "assigned_branches") for (const b of g.branchIds) ids.add(b)
  }
  return [...ids]
}

/** Gabungan batas numerik terketat dari semua grant yang berlaku bagi aktor. */
export function effectiveLimits(actor: Actor): Required<RoleLimits> {
  const merged = { ...EMPTY_LIMITS } as Required<RoleLimits>
  const tighten = (a: number | null, b: number | null): number | null =>
    a === null ? b : b === null ? a : Math.min(a, b)
  for (const g of actor.grants) {
    merged.maxDiscountPercent = tighten(
      merged.maxDiscountPercent,
      g.limits?.maxDiscountPercent ?? null
    )
    merged.maxDiscountAmount = tighten(
      merged.maxDiscountAmount,
      g.limits?.maxDiscountAmount ?? null
    )
    merged.maxRefundAmount = tighten(merged.maxRefundAmount, g.limits?.maxRefundAmount ?? null)
    merged.maxVoidWithoutApproval = tighten(
      merged.maxVoidWithoutApproval,
      g.limits?.maxVoidWithoutApproval ?? null
    )
    merged.maxCashTransaction = tighten(
      merged.maxCashTransaction,
      g.limits?.maxCashTransaction ?? null
    )
  }
  return merged
}

export type LimitReason = "percent" | "amount" | "refund" | "void" | "cash"

export type LimitCheck = { ok: true } | { ok: false; requiresApproval: true; reason: LimitReason }

/**
 * Periksa apakah nominal (Rupiah integer) berada dalam batas aktor untuk satu jenis limit.
 * Kebijakan: limit `null` = tidak dibatasi oleh role (lolos tanpa approval).
 */
export function checkAmountLimit(actor: Actor, kind: keyof RoleLimits, amount: number): LimitCheck {
  const cap = effectiveLimits(actor)[kind]
  if (cap === null) return { ok: true }
  if (amount <= cap) return { ok: true }
  const reason: LimitReason =
    kind === "maxRefundAmount"
      ? "refund"
      : kind === "maxVoidWithoutApproval"
        ? "void"
        : kind === "maxCashTransaction"
          ? "cash"
          : "amount"
  return { ok: false, requiresApproval: true, reason }
}

/**
 * Periksa diskon gabungan: persentase DAN nominal terhadap batas role.
 * Meloloskan jika keduanya di dalam batas (atau batas null = tidak dibatasi).
 */
export function checkDiscountLimit(actor: Actor, percent: number, amount: number): LimitCheck {
  const limits = effectiveLimits(actor)
  if (limits.maxDiscountPercent !== null && percent > limits.maxDiscountPercent) {
    return { ok: false, requiresApproval: true, reason: "percent" }
  }
  if (limits.maxDiscountAmount !== null && amount > limits.maxDiscountAmount) {
    return { ok: false, requiresApproval: true, reason: "amount" }
  }
  return { ok: true }
}
