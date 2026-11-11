# PETORA INDONESIA

Aplikasi web operasional **petshop + klinik hewan** yang self-hosted, multi-cabang, dengan satu owner. Satu cabang menjalankan petshop dan klinik sekaligus, sehingga tagihan dan operasi digabung: satu kunjungan, satu tagihan.

## Instalasi Cepat

1. Clone repo:
   ```
   git clone <repo> petora
   cd petora
   ```
2. Salin `.env.example` ke `.env` dan isi variabel minimal (`PETORA_DOMAIN`, email untuk sertifikat).
3. Jalankan:
   ```
   docker compose up -d
   ```
4. Buka aplikasi, selesaikan Setup Wizard (akun Owner, profil bisnis, cabang pertama).

Dokumentasi lengkap ada di `docs/`. Panduan pengembang di `CONTRIBUTING.md`.

## Atribusi
Teks "Powered by PETORA INDONESIA" dan pemberitahuan hak cipta/lisensi selalu tampil di UI dan dokumen cetak, tidak dapat dimatikan.

## Lisensi
Lihat `LICENSE`. Teks lisensi perlu ditinjau penasihat hukum sebelum distribusi.