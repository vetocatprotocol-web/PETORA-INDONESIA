# 08 — Deployment

## Layanan (docker compose)
| Layanan | Fungsi |
|---|---|
| caddy | Reverse proxy, HTTPS otomatis (Let's Encrypt) atau TLS internal untuk lokal |
| web | Next.js (staf, portal, API, webhook) |
| worker | BullMQ workers dan scheduler |
| postgres | Database (volume persisten) |
| redis | Queue/cache |
| init | Job satu kali: buat rahasia, jalankan migrasi, seed katalog permission |
| minio | Opsional (profile) untuk S3-compatible storage |
| backup | Backup terjadwal DB + file + kunci |

## Perilaku Otomatis
`docker compose up -d` (atau `./scripts/install.sh`) pada instalasi baru harus:
1. Membuat rahasia (`AUTH_SECRET`, kunci enkripsi master, password DB/Redis) dan menyimpannya di volume `secrets` bila belum ada. Tidak ada langkah manual menyalin kunci.
2. Menjalankan migrasi database dan seed katalog permission/role bawaan.
3. Menyalakan semua layanan dengan healthcheck dan urutan `depends_on` yang benar.
4. Mengarahkan ke Setup Wizard saat pertama kali dibuka.

## Setup Wizard
Hanya jalan jika belum terinisialisasi: akun Owner, profil bisnis, cabang pertama, zona waktu/bahasa/pajak, pengecekan domain/HTTPS/port 80-443, uji koneksi DB/Redis, opsi isi data contoh. Setelah selesai, wizard terkunci permanen.

Variabel minimal yang perlu diisi pengguna (mis. `PETORA_DOMAIN`, email untuk sertifikat). Sisnya otomatis; semua variabel terdokumentasi di `.env.example`.

## Upgrade & Backup
- Image berversi (tag semver); migrasi otomatis saat start.
- `scripts/upgrade.sh`: backup dulu, tarik image baru, migrasi, verifikasi kesehatan, rollback bila gagal.
- `scripts/backup.sh` / `restore.sh`: backup DB, file unggahan, dan kunci enkripsi (peringatan: tanpa kunci, kredensial integrasi tidak bisa dibaca). Uji restore didokumentasikan.

## Image Produksi
Multi-stage, non-root, kecil, tanpa dev dependency. Log ke stdout terstruktur; rotasi log.

## Mode Lokal/LAN
Dukung tanpa domain publik dengan peringatan bahwa webhook gateway dan WhatsApp Cloud API membutuhkan domain publik HTTPS.