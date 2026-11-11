# 09 — Security

## Model Ancaman & Mitigasi
| Ancaman | Mitigasi |
|---|---|
| Credential exposure | Hash Argon2id, kredensial terenkripsi di DB (AES-256-GCM), tidak ada rahasia di bundle klien |
| Brute force login | Rate limit, batas percobaan, kunci sementara |
| Session hijacking | Cookie httpOnly/secure/sameSite, pencabutan sesi, daftar perangkat aktif |
| Privilege escalation | Otorisasi server-side `can()` pada setiap operasi, scoping cabang di query layer |
| Webhook spoofing | Verifikasi signature/token wajib, endpoint tanpa sesi |
| Data leak antar pelanggan | Uji isolasi data, hanya field yang diizinkan di portal |
| File upload berbahaya | Validasi tipe/ukuran, penyimpanan di luar webroot, URL bertanda tangan |
| SQL injection | Parameterized query via Drizzle, validasi Zod |
| XSS | Sanitasi output, CSP |

## Kontrol
- 2FA TOTP (dapat diwajibkan per role).
- PIN supervisor untuk approval POS (di-hash, rate-limited).
- CSRF, header keamanan (CSP, HSTS, dll.).
- Validasi input Zod di semua batas, sanitasi output.
- Log tanpa data sensitif; kredensial tidak ditampilkan di log/error/ekspor.
- Kebijakan retensi dan anonimisasi data (pedoman UU PDP Indonesia).
- Ekspor data pelanggan; log akses data pribadi.
- Audit log untuk aksi sensitif: login, perubahan role/permission, perubahan integrasi, diskon di atas batas, void/refund, akses rekam medis, ekspor data.

## Status Implementasi Auth
Fondasi Fase 2 menyediakan hashing Argon2id, verifikasi password yang membatasi realm dan hanya menerima user aktif, sesi opaque dengan token acak 256-bit yang hanya disimpan sebagai SHA-256, serta limiter Redis per identitas/IP dengan key tersamarkan. Sesi memeriksa realm, status user, expiry, dan revocation. Limiter belum terhubung ke route login; cookie aman dan TOTP 2FA juga belum tersedia. Jangan membuka layanan login sebelum seluruh kontrol tersebut terintegrasi.

## Role Kritis
`integration.config.manage`, `user.manage`, `settings.manage` hanya Owner/Super Admin.