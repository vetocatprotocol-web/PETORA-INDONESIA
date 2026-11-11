# 06 — API

## Route Handler (Next.js)
- `/api/auth/staff/login` dan `/api/auth/customer/login` — POST credential, Redis throttling per identitas/IP, TOTP wajib bila user mengaktifkannya, cookie sesi HttpOnly per realm; audit login sukses/gagal.
- `/api/auth/{staff|customer}/session` — GET sesi aktif pada realm yang diminta.
- `/api/auth/{staff|customer}/logout` — POST cabut sesi dan hapus cookie; Origin diperiksa; audit logout.
- `/api/auth/{staff|customer}/totp/enroll` dan `/totp/confirm` — POST mulai enrollment dan konfirmasi kode TOTP; secret disimpan terenkripsi AES-256-GCM.
- `/api/setup/status` — GET status inisialisasi (untuk wizard/redirect).
- `/api/setup/initialize` — POST inisialisasi pertama (org + cabang + owner), seed role bawaan org, set sesi staf; ditolak jika sudah selesai.
- `/api/admin/me` — GET konteks staf login (actor/grants, cabang, katalog permission).
- `/api/admin/branches` — GET/POST cabang (`settings.manage`).
- `/api/admin/roles/:id` — PATCH ubah nama/scope/permission role kustom (`user.manage`); role Owner ditolak.
- `/api/admin/roles` — GET/POST (buat/klon dengan `sourceRoleId`) role & permission (`user.manage`).
- `/api/admin/users` — GET daftar pengguna organisasi; POST penugasan user↔role↔cabang (`user.manage`).
- `/api/admin/users/assignments` — GET daftar penugasan; DELETE hapus penugasan (`user.manage`).
- `/api/admin/integrations` — GET/POST koneksi integrasi terenkripsi (`integration.config.manage`); daftar adapter + koneksi aman.
- `/api/admin/integrations/:id` — PATCH/DELETE koneksi (`integration.config.manage`).
- `/api/admin/integrations/:id/test` — POST validasi kelengkapan konfigurasi/kredensial wajib dan simpan status tes (`integration.config.manage`). Tes live provider menyusul.
- `/api/admin/integrations/:id/send-test` — POST kirim pesan uji langsung via adapter (Resend/WhatsApp Cloud/Gateway), catat `outbound_messages`, audit hasil (`integration.config.manage`).
- `/api/admin/integrations/routes` — GET/POST/DELETE routing integrasi per purpose/cabang (`integration.config.manage`).
- `/api/admin/feature-flags` — GET/POST feature flag (`settings.manage`).
- `/api/admin/notification-templates` — GET/POST template notifikasi (key/channel/lang/subject/body) (`settings.manage`).
- `/api/admin/notification-templates/:id` — DELETE template (`settings.manage`).
- `/api/admin/notification-rules` — GET/POST/DELETE aturan event→template→kanal/audience (`settings.manage`).
- `/api/admin/audit-logs` — GET audit log (`audit.log.view`).
- `/api/webhook/midtrans` — POST, verifikasi signature, idempotensi, update `payment_attempt` + invoice.
- `/api/webhook/xendit` — POST, verifikasi signature, idempotensi, update `payment_attempt` + invoice.
- `/api/webhook/whatsapp/cloud` — POST, status pesan & webhook template, verifikasi token.
- `/api/webhook/whatsapp/gateway` — POST, status pengiriman gateway.
- `/api/webhooks/:provider` — POST/GET ingest webhook generik dengan idempotensi ke `webhook_events` (resolusi koneksi aktif/hint; verifikasi signature & handler bisnis per provider menyusul). Alias rute spesifik di atas akan diarahkan/dilengkapi.
- `/api/portal/*` — API pelanggan (profil, hewan, tagihan, pembayaran, booking, notifikasi), autentikasi terpisah realm customer.
- `/api/upload` — unggah file (validasi tipe/ukuran, tanda tangan URL, di luar webroot).

Endpoint webhook tidak memakai sesi; verifikasi webhook wajib.
Cookie sesi menggunakan nama terpisah (`petora_staff_session`, `petora_customer_session`), `HttpOnly`, `SameSite=Lax`, dan `Secure` pada production. API auth mengembalikan error generik untuk credential/TOTP salah dan `429` dengan `Retry-After` saat dibatasi.
Enrollment TOTP memerlukan `ENCRYPTION_MASTER_KEY` 32-byte base64url; Docker init membuat key persisten dan web membacanya dari volume secret read-only bila env kosong. Origin asing ditolak pada endpoint mutasi auth.

## Server Actions (Mutasi Internal)
Digunakan di panel staf (`/admin`). Setiap action dipanggil service layer di `packages/core` dengan otorisasi `can()` dan scoping cabang.

## API Portal (Pelanggan)
- Autentikasi: OTP WhatsApp (utama), email + password/magic link (opsional). Rate limit, batas percobaan.
- Endpoint: profil, daftar hewan, riwayat kunjungan, vaksinasi & jadwal berikutnya, dokumen yang diizinkan, tagihan & pembayaran gateway, riwayat pembayaran & struk, booking multi-cabang, jadwal ulang/batal, status layanan, notifikasi, preferensi.
- Hanya field yang diizinkan owner yang tampil; catatan internal dokter tidak pernah tampil.

## Idempotensi
Idempotency key untuk webhook dan pembuatan pembayaran. Duplikat dikembalikan hasil sama tanpa efek samping ganda.

## Error
Semua error ditangani eksplisit dengan pesan ramah pengguna (id/en); tidak menelan error. Response standar JSON dengan kode status HTTP yang tepat.