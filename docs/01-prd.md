# 01 — PRD (Product Requirements Document)

Sumber kebenaran untuk kebutuhan per modul adalah **AGENT.md Bagian 8 (Modul, Fitur, dan Fungsi)**. Dokumen ini meringkas alur pengguna utama dan persyaratan non-fungsional.

## Alur Pengguna Utama

### POS (Point of Sale)
1. Kasir buka shift, set kas awal.
2. Kasir tambah item ke keranjang (produk, obat, layanan klinik, grooming, penitipan) lewat pencarian cepat / barcode.
3. Pilih pelanggan dan hewan; kaitkan item ke hewan jika klinis.
4. Terapkan diskon/pajak/pembulatan sesuai batas role.
5. Pilih metode pembayaran (tunai, transfer, EDC, gateway QRIS/e-wallet/VA, split).
6. Untuk pembayaran online: buat charge via adapter → tampilkan QR/link → kirim ke WhatsApp pelanggan → tunggu webhook → status real-time (SSE).
7. Finalisasi invoice → cetak struk (browser + PDF) → kirim via WhatsApp/email.
8. Void/refund/retur butuh alasan dan approval sesuai kebijakan.

### Klinik Hewan
1. Pendaftaran kunjungan → nomor antrian → triase/prioritas.
2. Pemeriksaan: tanda vital, SOAP, diagnosa, tindakan, resep obat.
3. Resep mencopot stok obat (FEFO), label obat PDF.
4. Vaksinasi → sertifikat PDF, jadwal pengingat otomatis.
5. Lab order → input hasil → flag rentang normal.
6. Rawat inap: admisi, CPPT berkala, biaya harian otomatis ke tagihan.
7. Bedah: informed consent digital, catatan anestesi, laporan operasi.
8. Rekam medis final (dikunci) → koreksi via addendum berversi.
9. Tagihan gabungan dikirim ke POS untuk pembayaran.
10. Struk via WhatsApp ke pelanggan.

### Portal Pelanggan
1. Login OTP WhatsApp (atau email/password).
2. Lihat profil, hewan, riwayat kunjungan, vaksinasi, dokumen yang diizinkan.
3. Bayar tagihan via gateway (QRIS/e-wallet/VA).
4. Booking layanan multi-cabang dengan deposit opsional.
5. Lihat status grooming/penitipan dengan foto/update.
6. Notifikasi dan pengaturan preferensi.

## Persyaratan Non-Fungsional
- Uang = integer Rupiah (bigid), tanpa float.
- Invoice final immutable; koreksi lewat void/refund/retur.
- Stok berbasis ledger append-only (`stock_movements`).
- Audit log untuk aksi sensitif.
- Idempotensi untuk webhook dan pembuatan pembayaran.
- Soft delete untuk master data.
- Zona waktu: simpan UTC, tampilkan sesuai pengaturan.
- Otorisasi server-side pada setiap operasi (`can()`).
- Scoping cabang di query layer.
- Atribusi PETORA INDONESIA terkunci di UI.

## Izin dan Keamanan
- Hash Argon2id, sesi cookie httpOnly/secure/sameSite.
- 2FA TOTP, PIN supervisor untuk approval POS.
- Rate limit, CSRF, header keamanan (CSP, HSTS).
- Validasi input Zod di semua batas, sanitasi output.
- Kredensial integrasi terenkripsi di DB (AES-256-GCM), tidak kembali ke browser.
- Verifikasi webhook wajib, endpoint webhook tanpa sesi.