# 00 — Overview

## Visi
PETORA INDONESIA adalah aplikasi web operasional **petshop + klinik hewan** yang self-hosted, multi-cabang, dengan satu owner. Satu cabang menjalankan petshop dan klinik sekaligus, sehingga tagihan dan operasi digabung: satu kunjungan, satu tagihan, dapat berisi produk, obat, tindakan klinik, grooming, dan penitipan.

## Ruang Lingkup
1. Dokumentasi lengkap (teknis dan pengguna).
2. Aplikasi penuh: panel staf, portal pelanggan (PWA), worker latar belakang.
3. Paket Docker yang berjalan dengan konfigurasi otomatis.
4. Seluruh kode sumber, siap diberikan ke pelanggan.

## Keputusan Utama
| Topik | Keputusan |
|---|---|
| Model | Self-hosted, single-tenant (satu owner per instalasi), banyak cabang (`branch_id`) |
| Stack | Next.js (App Router, TypeScript), PostgreSQL + Drizzle, Redis + BullMQ |
| Deployment | Hanya Docker (docker compose), konfigurasi otomatis |
| Mata uang | Rupiah saja |
| Autentikasi | Dua realm (staf, pelanggan), OTP WhatsApp untuk portal |
| Pembayaran | Midtrans dan Xendit (QRIS, e-wallet, VA, m-banking) |
| WhatsApp | Cloud API resmi + gateway (Fonnte) |
| Email | Resend (adapter dapat diperluas, SMTP opsi) |
| PDF | Render server-side (HTML → PDF) |
| Realtime | Server-Sent Events |

## Glosarium
- **Owner:** pemilik instalasi tunggal, mengelola organisasi.
- **Cabang:** unit operasional (petshop + klinik) dengan `branch_id`.
- **Staf:** pengguna panel admin dengan role dan permission.
- **Pelanggan:** pemilik hewan dengan akun portal.
- **Hewan:** pasien pelanggan dengan rekam medis.
- **Invoice:** dokumen tagihan akhir yang immutable.
- **ADR:** catatan keputusan arsitektur (docs/adr/).

## Atribusi
Teks "Powered by PETORA INDONESIA" dan pemberitahuan hak cipta/lisensi selalu tampil di UI dan dokumen cetak, tidak punya saklar untuk dimatikan.