# 05 — Integrations

## Prinsip
Semua integrasi dikelola dari UI Super Admin (Pengaturan → Integrasi). Pola adapter: setiap provider mengimplementasikan interface kategori (`PaymentProvider`, `WhatsAppProvider`, `EmailProvider`, `StorageProvider`). Setiap adapter mendeklarasikan skema konfigurasi (field, tipe, wajib, rahasia, bantuan) sehingga form UI dirender otomatis. Kredensial terenkripsi di DB (AES-256-GCM, envelope dengan master key). Nilai rahasia tidak pernah dikirim kembali ke browser. Mode sandbox/production per koneksi. Tombol "Uji Koneksi" dengan hasil jelas. Status kesehatan di dashboard. Hanya Owner/Super Admin (`integration.config.manage`). Setiap perubahan masuk audit log. Satu koneksi aktif per kategori sebagai default; dukungan routing dikonfigurasi di UI. Webhook URL per provider ditampilkan otomatis di UI.

## Payment Gateway: Midtrans
- Referensi dokumentasi resmi: https://docs.midtrans.com (sandbox & production).
- Metode: QRIS, e-wallet (GoPay, OVO, DANA, ShopeePay, dll.), virtual account (BCA, BNI, Mandiri, BRI), kartu kredit, transfer bank.
- Alur: buat charge via adapter → simpan `payment_attempt` → kirim link/QR/VA ke pelanggan → pelanggan bayar di aplikasinya → webhook → verifikasi signature (Server Key) → update status idempoten → invoice berubah status → picu pengiriman struk.
- Status: `pending`, `paid`, `expired`, `failed`, `cancelled`, `refunded`, `partially_paid`.
- Webhook: verifikasi tanda tangan sesuai dokumentasi resmi Midtrans.
- Rekonsiliasi terjadwal di worker: periksa transaksi `pending` yang melewati batas ke API provider.
- Biaya gateway (MDR) dapat dicatat sebagai biaya.

## Payment Gateway: Xendit
- Referensi dokumentasi resmi: https://developers.xendit.co (sandbox & production).
- Metode: QRIS, e-wallet (OVO, GoPay, DANA, ShopeePay, LinkAja), virtual account, transfer bank, kartu kredit.
- Alur sama dengan Midtrans: buat invoice/charge → `payment_attempt` → kirim ke pelanggan → webhook → verifikasi signature (Xendit callback verification token) → update status idempoten.
- Webhook: verifikasi signature header sesuai dokumentasi resmi Xendit.

## WhatsApp: Cloud API Resmi
- Referensi: https://developers.facebook.com/docs/whatsapp (versi Graph API terbaru).
- Pesan yang dimulai bisnis wajib memakai template; sistem menegakkan ini dengan pesan error jelas.
- Manajemen template: variabel (`{{nama}}`, `{{total}}`, `{{link_bayar}}`, dll.), pratinjau, status persetujuan (sinkron dengan Meta), pemetaan event → template.
- Lampiran: struk/invoice PDF, sertifikat vaksin.
- Antrian pengiriman dengan retry/backoff, status (`queued/sent/delivered/read/failed`) dari webhook, log lengkap, penanganan opt-out.
- Digunakan juga untuk OTP login portal dengan rate limit ketat.

## WhatsApp: Gateway Pihak Ketiga (mis. Fonnte)
- Referensi dokumentasi resmi provider yang dipilih (catat versi/URL di dokumen ini saat implementasi).
- Adapter alternatif untuk pesan non-template dan broadcast.

## Email: Resend
- Referensi: https://resend.com/docs.
- Template email (HTML + teks), variabel, pratinjau, log pengiriman.
- SMTP generik sebagai adapter tambahan (opsi).

## Adapter Lainnya
Storage (lokal/S3), dan titik perluasan untuk integrasi masa depan (kurir, akuntansi) tanpa mengubah inti.

## Skema Konfigurasi (Contoh)
```json
{
  "category": "payment",
  "provider": "midtrans",
  "fields": [
    { "key": "server_key", "type": "secret", "required": true },
    { "key": "client_key", "type": "text", "required": true },
    { "key": "is_production", "type": "boolean", "required": true },
    { "key": "enabled_methods", "type": "array", "required": false }
  ]
}
```