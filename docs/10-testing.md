# 10 — Testing

## Strategi
- **Unit test** (Vitest): logika inti — harga/pajak/pembulatan, diskon, komisi, stok (FEFO/HPP), RBAC evaluator, penomoran, verifikasi webhook.
- **Integration test** (Postgres/Redis nyata): validasi migrasi awal/idempotensi, isolasi realm pada credential dan sesi, expiry/revocation sesi, serta rate limit per identitas/IP; transaksi POS end-to-end, konkurensi stok, idempotensi webhook, dan scoping cabang ditambahkan bersama modulnya.
- **Kontrak adapter**: suite test yang sama dijalankan terhadap mock tiap provider; simulasi webhook sukses/gagal/duplikat/kedaluwarsa.
- **E2E (Playwright)**: setup wizard, login staf/portal (OTP), alur POS lengkap, kunjungan klinik sampai tagihan, booking portal sampai pembayaran, pembuatan role kustom dan efeknya, install/upgrade Docker.
- **Keamanan**: uji otorisasi (setiap endpoint ditolak tanpa permission), rate limit, validasi unggahan, cek dependensi rentan.
- **Aksesibilitas dan performa:** pemeriksaan otomatis di CI.
- **Seed demo** yang realistis (dua cabang, staf, produk, hewan, riwayat) untuk demo dan pengujian.
- Target cakupan test untuk `packages/core` dan `packages/rbac` tinggi dan dijaga di CI.

## Cara Menjalankan
```
# Unit test
vitest run

# Integration test (butuh Postgres dan Redis nyata)
npm run test:integration

# E2E
npx playwright test

# Lint & typecheck
npm run format:check
npm run lint
npm run typecheck

# Build
npm run build
```
Semua harus hijau di akhir setiap fase (gerbang keluar).