# PROGRESS — PETORA INDONESIA

Checklist per fase dan per modul. Tandai `[x]` saat gerbang keluar fase terpenuhi.

## Fase 0 — Fondasi Dokumentasi
- [x] docs/00-overview.md — visi, ruang lingkup, glosarium
- [x] docs/01-prd.md — kebutuhan per modul, alur pengguna
- [x] docs/02-architecture.md — arsitektur, diagram komponen, keputusan
- [x] docs/03-erd.md — ERD (Mermaid) + kamus data
- [x] docs/04-permissions.md — katalog permission + matriks role bawaan
- [x] docs/05-integrations.md — adapter, skema konfigurasi, alur webhook, rujukan resmi
- [x] docs/06-api.md — route handler, webhook, API portal
- [x] docs/07-ui-ux.md — design system, peta halaman, alur, wireframe tekstual
- [x] docs/08-deployment.md — Docker, instalasi, upgrade, backup/restore, troubleshooting
- [x] docs/09-security.md — model ancaman, kontrol, kebijakan data
- [x] docs/10-testing.md — strategi dan cara menjalankan test
- [x] docs/11-user-guide/ — panduan pengguna per peran
- [x] docs/12-admin-guide.md — panduan Super Admin
- [x] docs/adr/ — catatan keputusan arsitektur
- [x] docs/CHANGELOG.md
- [x] LICENSE draft ditinjau
**Gerbang keluar Fase 0:** dokumen konsisten, setiap modul Bagian 8 punya kebutuhan, permission, entitas data. LULUS.

## Fase 1 — Fondasi Teknis
- [x] Monorepo, tooling (lint, format, typecheck, test), CI
- [x] Dockerfile, compose dasar (web, worker, postgres, redis, caddy), healthcheck
- [x] Paket db (Drizzle, migrasi SQL awal)
- [x] Paket ui (token desain, komponen dasar), i18n, layout dasar, tema
**Gerbang keluar Fase 1:** `docker compose up` menampilkan halaman dasar; lint, format, typecheck, unit/integration test, build, dan smoke test Docker lulus. LULUS.

## Fase 2 — Platform Inti
- [ ] Autentikasi dua realm, sesi, 2FA, rate limit
	- [x] Hash/verifikasi password Argon2id dan credential verification per realm
	- [x] Sesi opaque tersimpan sebagai hash, realm-scoped, dengan expiry dan revocation
	- [x] Redis rate limit per identitas dan IP dengan key tersamarkan dan reset identitas saat sukses
	- [x] Enrollment TOTP terenkripsi, login API/cookie kedua realm, enforcement TOTP dan proteksi replay
	- [x] Audit event autentikasi dasar (login sukses/gagal, logout) via `audit_logs`
	- [x] UI enrollment 2FA dasar (`/admin/security`)
	- [ ] Rate-limit operational tuning lanjutan
- [ ] RBAC penuh: katalog permission, role kustom, penugasan per cabang, batas numerik, approval, UI matriks, "lihat sebagai"
	- [x] Evaluator `can()` + batas numerik/branch scoping (library) dan loader aktor dari DB (`@petora/core/rbac`)
	- [x] API daftar/buat/update/klon role (`user.manage`) dengan katalog permission; Owner terkunci
	- [x] UI dasar buat role kustom, editor permission per role/modul, dan klon role (`/admin/roles`)
	- [x] API & UI penugasan user↔role↔cabang: daftar, tambah, hapus penugasan (`/api/admin/users`, `/api/admin/users/assignments`)
	- [ ] UI matriks banding/simulasi "lihat sebagai", approval flow enforcement, pembuatan akun pengguna lengkap
- [ ] Multi-cabang, pengaturan, branding + atribusi terkunci, penomoran dokumen, feature flags, audit log
	- [x] Helper core: audit log, settings/feature-flags, penomoran dokumen atomik
	- [x] API & UI dasar cabang (`settings.manage`), feature flags dan audit log viewer
	- [ ] Pengaturan/branding UI (atribusi PETORA terkunci), UI penomoran dokumen, hardening scoping cabang end-to-end
- [ ] Kerangka integrasi: registry adapter, form konfigurasi dinamis, enkripsi kredensial, uji koneksi, webhook ingest + idempotensi
	- [x] Registry adapter + skema field, enkripsi kredensial AES-256-GCM, CRUD koneksi terenkripsi (API, permission-guarded)
	- [x] UI integrasi: render field config/kredensial per adapter, aktif/nonaktif, hapus koneksi
	- [x] Uji koneksi berbasis validasi kelengkapan field wajib (API `.../test` + UI, simpan status tes)
	- [x] Ingest webhook generik idempoten dasar (`/api/webhooks/:provider` → `webhook_events`, resolusi koneksi/hint)
	- [x] Routing integrasi dasar per purpose/branch (`integration_routes`: helper core + API `/api/admin/integrations/routes`, UI di `/admin/integrations`)
	- [ ] Tes koneksi live ke provider, verifikasi signature & handler bisnis webhook per provider
- [ ] Adapter WhatsApp (Cloud API + gateway) dan Resend, mesin notifikasi + antrian worker + template
	- [x] Adapter kirim pesan dasar (Resend, WhatsApp Cloud, WhatsApp Gateway) dan endpoint/UI "Kirim uji" (`/api/admin/integrations/:id/send-test`)
	- [x] Worker memproses `outbound_messages` terjadwal/queued (poll + job `outbound.send/poll`, retry dasar via status/attempts)
	- [x] Mesin notifikasi dasar: helper render template + dispatch event→rule→template→outbound/inbox (`packages/core/notifications`), CRUD API+UI template & aturan (`/admin/notification-templates`, `/admin/notification-rules`)
	- [ ] Render variabel lanjutan/pemilihan tujuan otomatis per audience, retry/backoff penuh & status delivery dari webhook, quiet hours/opt-out, template WA Cloud approval sync
- [ ] Storage file, mesin dokumen/PDF
- [ ] Setup Wizard dan seed katalog permission di Docker
	- [x] Pembuatan AUTH_SECRET dan ENCRYPTION_MASTER_KEY persisten saat init
	- [x] Migrasi otomatis sebelum web/worker dimulai
	- [x] Seed katalog permission (idempotent) saat init dan seed role bawaan per organisasi saat setup
	- [x] Setup Wizard dasar: deteksi status, `/setup`, `/api/setup/status|initialize` (org + cabang pertama + owner + sesi)
	- [ ] Penyempurnaan wizard (cek domain/HTTPS/port, uji DB/Redis, opsi data contoh, penguncian permanen eksplisit & hardening)
**Gerbang keluar Fase 2:** instalasi bersih → wizard → owner membuat role kustom, cabang, mengonfigurasi WhatsApp dan email dari UI, mengirim pesan uji; test RBAC dan scoping cabang hijau.

## Fase 3 — Data Induk
- [ ] Pelanggan, hewan, staf, supplier, kategori/merek/satuan, produk dan varian, layanan dan paket, resource, kamar/kandang, pajak, metode bayar
- [ ] Impor/ekspor, pencarian global, penggabungan duplikat
**Gerbang keluar Fase 3:** semua master dapat dikelola penuh sesuai permission; impor CSV berfungsi; test hijau.

## Fase 4 — Inventori & Pengadaan
- [ ] Gudang, batch/expiry, ledger stok, PO, GRN, retur supplier, transfer, opname, penyesuaian, HPP, kartu stok, alert, bundel/resep, label barcode PDF
**Gerbang keluar Fase 4:** uji konkurensi stok lulus; valuasi dan kartu stok akurat; laporan stok dan kedaluwarsa berfungsi.

## Fase 5 — POS & Pembayaran
- [ ] Shift kasir, keranjang, diskon/pajak/pembulatan, multi-metode dan split payment, hold/resume, void/refund/retur dengan approval, piutang, deposit, voucher, poin
- [ ] Adapter Midtrans dan Xendit: charge, QRIS/e-wallet/VA, webhook terverifikasi, rekonsiliasi, status real-time
- [ ] Struk/invoice cetak browser + PDF, kirim via WhatsApp/email, tagihan gabungan dari kunjungan klinik/layanan
**Gerbang keluar Fase 5:** transaksi end-to-end termasuk bayar via sandbox gateway, webhook duplikat/terlambat ditangani, struk terkirim ke WhatsApp; test e2e POS hijau.

## Fase 6 — Klinik Inti
- [ ] Registrasi dan antrian real-time, pemeriksaan SOAP, diagnosa, tindakan, resep dan dispensing (potong stok), lampiran, form builder + template, pengunci dan addendum, visibilitas portal per field
- [ ] Vaksinasi dan protokol, sertifikat PDF, lab dan penunjang, dokumen (surat sehat, rujukan)
- [ ] Integrasi ke tagihan POS
**Gerbang keluar Fase 6:** satu kunjungan penuh: daftar → periksa → resep → vaksin → tagihan → bayar → struk WhatsApp; owner membuat template baru tanpa mengubah kode.

## Fase 7 — Layanan Lanjutan & Penjadwalan
- [ ] Rawat inap (CPPT, jadwal obat, biaya harian), bedah dan informed consent digital
- [ ] Grooming (workflow, foto), penitipan (reservasi, log harian, biaya otomatis)
- [ ] Kalender, ketersediaan, janji temu, daftar tunggu, no-show
**Gerbang keluar Fase 7:** semua layanan menghasilkan item tagihan otomatis; konflik jadwal tercegah; test hijau.

## Fase 8 — Keuangan, Komisi, Laporan
- [ ] Kas/bank, biaya, hutang/piutang, jurnal otomatis, laba rugi, arus kas, neraca sederhana, penutupan periode, rekap pajak
- [ ] Komisi lengkap (aturan, tier, split, siklus pending/final/reversal) di balik saklar owner; laporan komisi
- [ ] Seluruh laporan Bagian 8.11, saved views, ekspor, laporan terjadwal
**Gerbang keluar Fase 8:** angka laporan cocok dengan data transaksi (uji rekonsiliasi); komisi berubah benar saat refund; saklar komisi mati menyembunyikan semuanya.

## Fase 9 — Portal Pelanggan
- [ ] Autentikasi OTP WhatsApp, klaim akun, pendaftaran mandiri (opsional)
- [ ] Profil, hewan, riwayat, vaksinasi, dokumen, tagihan dan pembayaran gateway, booking multi-cabang dengan deposit opsional, status layanan, notifikasi, PWA
**Gerbang keluar Fase 9:** pelanggan mendaftar → booking → bayar deposit → hadir → melihat riwayat; uji privasi.

## Fase 10 — Otomatisasi & SDM
- [ ] Reminder terjadwal (vaksin, booking, tagihan, ulang tahun, follow-up), aturan notifikasi di UI, quiet hours, opt-out
- [ ] SDM dasar: jadwal, absensi, cuti, pengingat STR
- [ ] Dashboard dan widget kustom, pencarian global, command palette penuh
**Gerbang keluar Fase 10:** pengingat terkirim tepat dan tidak duplikat; seluruh pintasan dan palet berfungsi.

## Fase 11 — Pengerasan & Kualitas
- [ ] Audit keamanan menyeluruh, uji penetrasi dasar internal, perbaikan temuan
- [ ] Performa (indeks, kueri, caching), aksesibilitas, polesan UI/animasi, penanganan state kosong/error di semua halaman
- [ ] Cakupan test final, uji beban POS, uji restore backup
**Gerbang keluar Fase 11:** semua suite hijau; tidak ada temuan keamanan tinggi terbuka; pemeriksaan a11y lulus.

## Fase 12 — Pengemasan & Rilis
- [ ] Finalisasi install.sh, upgrade.sh (+rollback), backup.sh, restore.sh; uji instalasi bersih dan upgrade pada mesin baru
- [ ] Dokumentasi pengguna dan admin selesai, .env.example, README, LICENSE final, CHANGELOG
- [ ] Seed demo, katalog komponen, versi 1.0.0 dengan image bertag
**Gerbang keluar Fase 12:** pengguna baru dapat memasang dari nol hanya dengan Docker mengikuti README, menyelesaikan wizard, dan menjalankan seluruh alur utama tanpa menyentuh kode.