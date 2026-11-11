# 06 — API

## Route Handler (Next.js)
- `/api/auth/staff/login` dan `/api/auth/customer/login` — POST credential, Redis throttling per identitas/IP, TOTP wajib bila user mengaktifkannya, cookie sesi HttpOnly per realm.
- `/api/auth/{staff|customer}/session` — GET sesi aktif pada realm yang diminta.
- `/api/auth/{staff|customer}/logout` — POST cabut sesi dan hapus cookie; Origin diperiksa.
- `/api/auth/{staff|customer}/totp/enroll` dan `/totp/confirm` — POST mulai enrollment dan konfirmasi kode TOTP; secret disimpan terenkripsi AES-256-GCM.
- `/api/webhook/midtrans` — POST, verifikasi signature, idempotensi, update `payment_attempt` + invoice.
- `/api/webhook/xendit` — POST, verifikasi signature, idempotensi, update `payment_attempt` + invoice.
- `/api/webhook/whatsapp/cloud` — POST, status pesan & webhook template, verifikasi token.
- `/api/webhook/whatsapp/gateway` — POST, status pengiriman gateway.
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