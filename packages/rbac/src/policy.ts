/**
 * Tipe kebijakan per-role yang disimpan di DB (docs/04-permissions.md).
 * Dievaluasi oleh evaluator `can()` dan dipakai ulang oleh `packages/core`.
 */

/** Cakupan data sebuah penugasan role. */
export type DataScope = "all_branches" | "assigned_branches" | "self_only"

export interface RoleLimits {
  /** Persentase maksimum diskon tanpa approval (mis. 20 = 20%). Null = tidak dibatasi by role (tetap bisa dibatasi approval). */
  maxDiscountPercent: number | null
  /** Nominal maksimum diskon (Rupiah integer) tanpa approval. */
  maxDiscountAmount: number | null
  /** Nominal maksimum refund tanpa approval (Rupiah integer). */
  maxRefundAmount: number | null
  /** Nominal maksimum void tanpa approval (Rupiah integer). */
  maxVoidWithoutApproval: number | null
  /** Nominal maksimum transaksi tunai (Rupiah integer). */
  maxCashTransaction: number | null
}

export const EMPTY_LIMITS: RoleLimits = {
  maxDiscountPercent: null,
  maxDiscountAmount: null,
  maxRefundAmount: null,
  maxVoidWithoutApproval: null,
  maxCashTransaction: null
}

/** Grant/deny tambahan per pengguna di luar role (dengan alasan + jejak audit). */
export interface PermissionOverride {
  permission: string
  effect: "grant" | "deny"
}
