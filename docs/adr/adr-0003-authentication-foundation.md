# ADR-0003: Authentication Foundation

- Status: Accepted
- Date: 2026-11-11

## Context

Fase 2 membutuhkan dua realm terisolasi (staff dan customer), penyimpanan password yang tahan serangan offline, serta sesi yang dapat dicabut tanpa menyimpan bearer token mentah.

## Decision

- Gunakan Argon2id dengan memory cost 19 MiB, time cost 2, dan parallelism 1.
- Terima password baru sepanjang 12 sampai 1024 byte UTF-8.
- Batasi pencarian credential dan sesi ke realm yang diminta; user harus aktif dan belum dihapus.
- Buat token sesi dari 32 byte acak, simpan hanya SHA-256 token, dan wajibkan expiry dari pemanggil.
- Terapkan limiter Redis terdistribusi dengan bucket terpisah per identitas dan IP; hash input sebelum dijadikan key dan hanya reset bucket identitas setelah login sukses.
- Gunakan TOTP enam digit dengan periode 30 detik dan toleransi satu langkah waktu; simpan secret memakai AES-256-GCM, IV acak 96-bit, authentication tag, dan AAD berisi user ID.
- Route login, cookie, dan TOTP 2FA harus terintegrasi sebelum alur autentikasi dibuka ke klien.

## Consequences

- Database breach tidak langsung mengungkap bearer token sesi.
- Rate limit konsisten antar instance aplikasi dan tidak menyimpan identifier/IP mentah sebagai key.
- Secret TOTP terenkripsi terikat ke user yang memilikinya sehingga ciphertext tidak dapat dipindah antar akun.
- Perubahan parameter hash perlu mempertimbangkan kapasitas CPU/memori saat login.
- Fondasi ini belum menjadi alur login end-to-end; route, cookie, dan TOTP tetap menjadi gerbang sebelum rilis autentikasi.