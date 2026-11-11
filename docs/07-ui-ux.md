# 07 — UI/UX

## Prinsip Desain
Profesional, hangat, cepat. Tema hewan peliharaan namun dewasa: satu warna aksen yang dapat diubah owner, tipografi yang jelas, ilustrasi/ikon ramah untuk state kosong, tidak kekanak-kanakan.

- Tema: terang/gelap/otomatis, kepadatan tampilan (nyaman/ringkas), warna aksen dari branding.
- Navigasi: sidebar yang dapat dilipat, command palette (Ctrl/Cmd+K), breadcrumb, pergantian cabang yang menonjol, pencarian global.
- Interaksi: animasi halus dan bermakna, skeleton loader, optimistic update, toast, konfirmasi aksi berbahaya, undo bila mungkin.
- Tabel data: kolom dapat diatur, filter, saved views, ekspor, pagination/virtualisasi.
- POS: layout dua panel ramah tablet dan layar sentuh, target sentuh besar, pintasan keyboard, kontras tinggi.
- Dashboard: widget yang dapat diatur pengguna.
- Responsif penuh (HP, tablet, desktop); portal pelanggan mobile-first.
- Aksesibilitas: WCAG AA, navigasi keyboard, fokus terlihat, label ARIA, dukung reduced motion.
- Performa: LCP cepat, code splitting, gambar dioptimalkan, tidak ada layout shift.
- Konsistensi: semua komponen dari `packages/ui`, katalog komponen, token desain terpusat.

## Peta Halaman (Utama)

Panel Staf (`/admin`):
- `/admin/dashboard` — ringkasan per cabang/semua cabang.
- `/admin/pos` — kasir, keranjang, pembayaran.
- `/admin/customers` — pelanggan & hewan.
- `/admin/products` — produk & inventori.
- `/admin/inventory` — stok, PO, opname.
- `/admin/clinic` — kunjungan, antrian, rekam medis.
- `/admin/appointments` — kalender & janji temu.
- `/admin/grooming` — jadwal grooming.
- `/admin/boarding` — penitipan.
- `/admin/finance` — laporan keuangan.
- `/admin/commission` — laporan komisi (saklar owner).
- `/admin/settings` — integrasi, role, branding, template.
- `/admin/rbac` — manajemen role & permission.
- `/admin/audit` — audit log.

Portal Pelanggan (`/portal`):
- `/portal/login` — OTP WhatsApp / email.
- `/portal/dashboard` — profil, hewan, tagihan.
- `/portal/pets` — daftar hewan.
- `/portal/invoices` — tagihan & pembayaran.
- `/portal/booking` — booking layanan.
- `/portal/documents` — dokumen yang diizinkan.
- `/portal/notifications` — notifikasi.
- `/portal/settings` — preferensi.

## Wireframe Tekstual (POS)
```
+-----------------------------------------------------------+
| [Cabang] [Shift: Buka/Tutup] [Pencarian global] [Profil] |
+------------------------------+----------------------------+
| Pencarian produk/barcode     | Keranjang (item, qty, nota) |
| - Produk                     | - Diskon per item/tx        |
| - Obat                       | - Pajak & pembulatan        |
| - Layanan                    | - Metode pembayaran         |
| - Grooming                   | - Split payment             |
| - Penitipan                  | [Bayar] [Hold] [Void]       |
+------------------------------+----------------------------+
| Pelanggan & Hewan            | Struk preview / Kirim WA    |
+------------------------------+----------------------------+
```
Footer atribusi "Powered by PETORA INDONESIA" konsisten di panel staf, portal, dan dokumen cetak; tidak dapat dimatikan.