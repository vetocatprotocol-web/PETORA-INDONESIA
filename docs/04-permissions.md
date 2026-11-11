# 04 — Permissions

## Format
`modul.sumber.aksi`, contoh: `pos.sale.create`, `pos.sale.void`, `pos.discount.override`, `inventory.stock.adjust`, `medical.record.edit`, `medical.record.view_internal_notes`, `finance.report.view`, `integration.config.manage`.

## Katalog Permission (Kunci → Deskripsi id/en → Kategori Risiko)

| Kunci | Deskripsi | Risiko |
|---|---|---|
| pos.sale.create | Buat transaksi penjualan | rendah |
| pos.sale.void | Batalkan transaksi | tinggi |
| pos.sale.refund | Refund pembayaran | tinggi |
| pos.discount.override | Override batas diskon | tinggi |
| pos.payment.receive | Terima pembayaran | rendah |
| pos.shift.open | Buka shift kasir | sedang |
| pos.shift.close | Tutup shift kasir | sedang |
| inventory.stock.view | Lihat stok | rendah |
| inventory.stock.adjust | Sesuaikan stok | tinggi |
| inventory.purchase.order | Buat PO | sedang |
| inventory.goods.receipt | Terima barang | sedang |
| medical.record.view | Lihat rekam medis | sedang |
| medical.record.edit | Edit rekam medis | tinggi |
| medical.record.view_internal_notes | Lihat catatan internal | tinggi |
| medical.record.finalize | Kunci rekam medis | tinggi |
| medical.prescription.create | Buat resep | sedang |
| vaccination.manage | Kelola vaksinasi | sedang |
| appointment.manage | Kelola janji temu | sedang |
| grooming.job.manage | Kelola grooming | sedang |
| boarding.manage | Kelola penitipan | sedang |
| customer.manage | Kelola pelanggan | sedang |
| product.manage | Kelola produk | sedang |
| finance.report.view | Lihat laporan keuangan | tinggi |
| finance.journal.post | Posting jurnal | tinggi |
| integration.config.manage | Kelola integrasi | kritis |
| user.manage | Kelola pengguna & role | kritis |
| audit.log.view | Lihat audit log | sedang |
| settings.manage | Kelola pengaturan sistem | kritis |
| commission.report.view | Lihat laporan komisi | sedang |

## Matriks Role Bawaan (Default)

| Role | Permission Utama | Cakupan |
|---|---|---|
| Owner | semua permission, cabang semua | organisasi |
| Super Admin | semua kecuali Owner terkunci | cabang semua |
| Manajer Cabang | operasi cabang, laporan, staf cabang | cabang ditugasi |
| Kasir | POS, shift, pembayaran | cabang ditugasi |
| Resepsionis | antrian, janji temu, pendaftaran | cabang ditugasi |
| Dokter Hewan | rekam medis, resep, diagnosa | cabang ditugasi |
| Paramedis/Perawat | vital, rawat inap, observasi | cabang ditugasi |
| Groomer | layanan grooming, foto before/after | cabang ditugasi |
| Petugas Penitipan | log harian penitipan, kamar | cabang ditugasi |
| Admin Gudang | stok, PO, penerimaan, opname | cabang ditugasi |
| Keuangan/Akuntan | laporan keuangan, jurnal, hutang/piutang | cabang semua |

Role bawaan ditandai sistem, dapat diubah/klon, tetapi Owner tidak dapat dihapus dan selalu ada minimal satu Owner aktif.

## Model Cakupan Data
- `semua cabang`
- `cabang tertentu`
- `hanya data sendiri`

## Batas Numerik Per Role
Maksimum diskon (% dan nominal), batas refund, batas void tanpa approval, batas transaksi tunai. Override melebihi batas butuh approval PIN supervisor.

## Field-Level Permission
HPP/harga beli, margin, komisi orang lain, catatan internal medis, data kontak pelanggan.

## Pengecualian Per User
Grant/deny tambahan di luar role dengan alasan dan jejak audit.