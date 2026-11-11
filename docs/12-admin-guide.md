# Panduan Super Admin

## Integrasi
Tambah koneksi integrasi di Pengaturan → Integrasi. Pilih kategori (pembayaran, WhatsApp, email, storage) dan provider. Isi skema konfigurasi yang dirender otomatis. Uji koneksi sebelum simpan. Kredensial terenkripsi dan tidak pernah dikembalikan ke browser.

## Role & Hak Akses
Buat/kustom role di manajemen role. Matriks permission (modul × aksi). Beri batas numerik (diskon, refund, void) per role. Penugasan user ↔ role ↔ cabang. Role Owner tidak dapat dihapus; selalu ada minimal satu Owner aktif.

## Form Builder Rekam Medis
Buat template per jenis layanan (umum, vaksin, bedah, dental, dll.). Bagian, field, aturan wajib/kondisional, versi template. Visibilitas ke portal diatur per field/bagian.

## Kebijakan & Branding
Pajak, lokalisasi, penomoran dokumen, template dokumen, feature flags per modul, approval, diskon, refund, retensi data, booking, deposit.

## Audit Log & Kesehatan Sistem
Lihat aksi sensitif, kesehatan sistem (DB, Redis, antrian, integrasi, disk), impor/ekspor data, backup/restore dari UI, info versi dan cek update.