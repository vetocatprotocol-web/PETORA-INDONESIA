# 08 — Deployment

`compose.yaml` di root adalah entrypoint standar dan menyertakan definisi layanan di `docker/compose.yaml`.

## Layanan (docker compose)
| Layanan | Fungsi |
|---|---|
| caddy | Reverse proxy, HTTPS otomatis (Let's Encrypt) atau TLS internal untuk lokal |
| web | Next.js (staf, portal, API, webhook) |
| worker | BullMQ workers dan scheduler |
| postgres | Database (volume persisten) |
| redis | Queue/cache |
| init | Job satu kali: membuat/memvalidasi secret persisten dan menjalankan migrasi SQL versioned |
| minio | Opsional (profile) untuk S3-compatible storage |
| backup | Backup terjadwal DB + file + kunci |

## Perilaku Otomatis
`docker compose up -d` (atau `./scripts/install.sh`) pada instalasi baru harus:
1. Membuat `AUTH_SECRET` dan `ENCRYPTION_MASTER_KEY` bila belum ada, lalu menyimpannya di volume `petora_secrets`; env value non-kosong menjadi override eksplisit. Tidak ada langkah manual menyalin kunci.
2. Menjalankan migrasi SQL versioned dari `packages/db/drizzle` melalui Drizzle. Jika migrasi gagal, layanan web dan worker tetap menunggu init berhasil.
3. Menyalakan semua layanan dengan healthcheck dan urutan `depends_on` yang benar.
4. Mengarahkan ke Setup Wizard saat pertama kali dibuka.

Job `init` berjalan setelah PostgreSQL dan Redis sehat. Layanan `web` dan `worker` baru dimulai setelah job ini selesai dengan sukses. File secret dimiliki UID aplikasi, bermode baca saja, dan volume dipasang read-only pada runtime.

Fondasi Docker kini menghasilkan secret secara otomatis dan menjalankan migrasi sebelum layanan aplikasi. Seed permission dan Setup Wizard masih menjadi pekerjaan Fase 2.

## Setup Wizard
Hanya jalan jika belum terinisialisasi: akun Owner, profil bisnis, cabang pertama, zona waktu/bahasa/pajak, pengecekan domain/HTTPS/port 80-443, uji koneksi DB/Redis, opsi isi data contoh. Setelah selesai, wizard terkunci permanen.

Variabel minimal yang perlu diisi pengguna adalah `PETORA_DOMAIN` untuk domain publik; nilai default `localhost` dapat dipakai untuk pengujian lokal. Caddy mengelola HTTPS otomatis saat domain publik diarahkan ke server. Sisanya otomatis; semua variabel terdokumentasi di `.env.example`.

## Upgrade & Backup
- Image berversi (tag semver); migrasi otomatis saat start.
- `scripts/upgrade.sh`: backup dulu, tarik image baru, migrasi, verifikasi kesehatan, rollback bila gagal.
- `scripts/backup.sh` / `restore.sh`: backup DB, file unggahan, dan kunci enkripsi (peringatan: tanpa kunci, kredensial integrasi tidak bisa dibaca). Uji restore didokumentasikan.

## Image Produksi
Multi-stage, non-root, kecil, tanpa dev dependency. Log ke stdout terstruktur; rotasi log.

## Mode Lokal/LAN
Dukung tanpa domain publik dengan peringatan bahwa webhook gateway dan WhatsApp Cloud API membutuhkan domain publik HTTPS.