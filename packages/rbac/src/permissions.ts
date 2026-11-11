/**
 * Katalog permission PETORA INDONESIA.
 * Didefinisikan di kode agar terversi (AGENT.md Bagian 6.1), lalu disinkronkan ke DB saat migrasi/seed.
 * Sumber kebenaran dokumen: docs/04-permissions.md — setiap kunci di katalog ini wajib ada di sana.
 */

export type RiskLevel = "rendah" | "sedang" | "tinggi" | "kritis"

export interface PermissionDef {
  /** Kunci berformat `modul.sumber.aksi`, contoh `pos.sale.create`. */
  key: string
  /** Modul untuk pengelompokan di UI matriks. */
  module: string
  descriptionId: string
  descriptionEn: string
  risk: RiskLevel
}

function p(
  key: string,
  module: string,
  descriptionId: string,
  descriptionEn: string,
  risk: RiskLevel
): PermissionDef {
  return { key, module, descriptionId, descriptionEn, risk }
}

export const PERMISSION_CATALOG: readonly PermissionDef[] = [
  // POS
  p("pos.sale.create", "pos", "Buat transaksi penjualan", "Create sale transaction", "rendah"),
  p("pos.sale.void", "pos", "Batalkan transaksi", "Void transaction", "tinggi"),
  p("pos.sale.refund", "pos", "Refund pembayaran", "Refund payment", "tinggi"),
  p("pos.discount.override", "pos", "Override batas diskon", "Override discount limit", "tinggi"),
  p("pos.payment.receive", "pos", "Terima pembayaran", "Receive payment", "rendah"),
  p("pos.shift.open", "pos", "Buka shift kasir", "Open cashier shift", "sedang"),
  p("pos.shift.close", "pos", "Tutup shift kasir", "Close cashier shift", "sedang"),

  // Inventori & pengadaan
  p("inventory.stock.view", "inventory", "Lihat stok", "View stock", "rendah"),
  p("inventory.stock.adjust", "inventory", "Sesuaikan stok", "Adjust stock", "tinggi"),
  p("inventory.purchase.order", "inventory", "Buat PO", "Create purchase order", "sedang"),
  p("inventory.goods.receipt", "inventory", "Terima barang", "Receive goods", "sedang"),

  // Klinik / rekam medis
  p("medical.record.view", "medical", "Lihat rekam medis", "View medical record", "sedang"),
  p("medical.record.edit", "medical", "Edit rekam medis", "Edit medical record", "tinggi"),
  p(
    "medical.record.view_internal_notes",
    "medical",
    "Lihat catatan internal",
    "View internal notes",
    "tinggi"
  ),
  p(
    "medical.record.finalize",
    "medical",
    "Kunci rekam medis",
    "Finalize (lock) medical record",
    "tinggi"
  ),
  p("medical.prescription.create", "medical", "Buat resep", "Create prescription", "sedang"),
  p("vaccination.manage", "medical", "Kelola vaksinasi", "Manage vaccinations", "sedang"),

  // Penjadwalan & layanan
  p("appointment.manage", "operations", "Kelola janji temu", "Manage appointments", "sedang"),
  p("grooming.job.manage", "operations", "Kelola grooming", "Manage grooming jobs", "sedang"),
  p("boarding.manage", "operations", "Kelola penitipan", "Manage boarding", "sedang"),

  // Data induk
  p("customer.manage", "master", "Kelola pelanggan", "Manage customers", "sedang"),
  p("product.manage", "master", "Kelola produk", "Manage products", "sedang"),

  // Keuangan & komisi
  p("finance.report.view", "finance", "Lihat laporan keuangan", "View financial reports", "tinggi"),
  p("finance.journal.post", "finance", "Posting jurnal", "Post journal entries", "tinggi"),
  p(
    "commission.report.view",
    "finance",
    "Lihat laporan komisi",
    "View commission reports",
    "sedang"
  ),

  // Platform
  p("integration.config.manage", "platform", "Kelola integrasi", "Manage integrations", "kritis"),
  p("user.manage", "platform", "Kelola pengguna & role", "Manage users & roles", "kritis"),
  p("audit.log.view", "platform", "Lihat audit log", "View audit log", "sedang"),
  p("settings.manage", "platform", "Kelola pengaturan sistem", "Manage system settings", "kritis")
] as const

const catalogByKeys: Record<string, PermissionDef> = Object.fromEntries(
  PERMISSION_CATALOG.map((d) => [d.key, d])
)

export function isPermissionKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(catalogByKeys, key)
}

export function getPermission(key: string): PermissionDef | undefined {
  return catalogByKeys[key]
}

export function listModules(): string[] {
  const seen: string[] = []
  for (const def of PERMISSION_CATALOG) {
    if (!seen.includes(def.module)) seen.push(def.module)
  }
  return seen
}
