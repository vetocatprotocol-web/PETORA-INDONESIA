# AGENT.md — PETORA INDONESIA

> Perintah kerja untuk agent pengembang. Baca seluruh dokumen ini sebelum menulis satu baris pun. Dokumen ini adalah sumber kebenaran tunggal: dari pembuatan dokumentasi sampai aplikasi jadi, lengkap, dan siap dipasang.

---

## 1. Misi

Bangun **PETORA INDONESIA**: web app operasional **petshop + klinik hewan** yang self-hosted, multi-cabang, dengan satu owner. Satu cabang menjalankan petshop dan klinik sekaligus, sehingga **tagihan dan operasional digabung**: satu kunjungan, satu tagihan, bisa berisi produk, obat, tindakan klinik, grooming, dan penitipan.

Hasil akhir yang harus ada:
1. Dokumentasi lengkap (teknis dan pengguna).
2. Aplikasi penuh: panel staf, portal pelanggan (PWA), worker latar belakang.
3. Paket Docker yang berjalan dengan konfigurasi otomatis.
4. Seluruh kode sumber, siap diberikan ke pelanggan.

Nama aplikasi **dapat diganti** oleh owner (nama, logo, warna), tetapi atribusi **"Powered by PETORA INDONESIA"** dan teks hak cipta/lisensi **selalu tampil** dan tidak punya saklar untuk dimatikan di UI.

---

## 2. Aturan Kerja Agent

1. **Kerjakan fase berurutan** (Bagian 17). Jangan lompat. Setiap fase punya gerbang keluar; fase berikutnya baru boleh dimulai setelah gerbang lolos.
2. **Dokumentasi dulu, kode kemudian.** Fase 0 menghasilkan dokumen rancangan. Setelah itu, dokumen harus tetap sinkron dengan kode: ubah kode berarti ubah dokumen di commit yang sama.
3. **Lacak progres** di `docs/PROGRESS.md` (checklist per fase dan per modul). Perbarui setiap selesai satu butir.
4. **Ambil keputusan kecil sendiri**, catat sebagai ADR singkat di `docs/adr/`. Bertanya ke pemilik proyek hanya untuk hal yang benar-benar memblokir (kredensial, keputusan bisnis yang tidak bisa diturunkan dari dokumen ini).
5. **Jangan mengarang API pihak ketiga.** Sebelum mengimplementasikan Midtrans, Xendit, WhatsApp Cloud API, Fonnte, atau Resend, baca dokumentasi resmi terbaru mereka dan catat versi/URL rujukan di `docs/05-integrations.md`.
6. **Dilarang stub yang berpura-pura jalan.** Fitur yang selesai berarti benar-benar berfungsi end-to-end (UI, validasi, otorisasi, database, test). Tidak boleh ada `TODO`, `FIXME`, data palsu, atau tombol mati pada akhir fase yang mengklaimnya.
7. **Tidak ada hardcode** untuk: kredensial, URL provider, tarif pajak, nama bisnis, template pesan, daftar role, penomoran dokumen. Semuanya data yang dapat dikonfigurasi.
8. **Setiap akhir fase** jalankan: lint, typecheck, unit test, integration test, build, dan smoke test Docker. Semua harus hijau.
9. **Commit kecil dan bermakna** (Conventional Commits). Satu perubahan logis per commit.
10. **Bahasa:** kode, nama variabel, dan komentar teknis dalam bahasa Inggris. UI default bahasa Indonesia (dengan i18n, bahasa Inggris tersedia). Dokumentasi pengguna dalam bahasa Indonesia; dokumentasi teknis boleh bahasa Indonesia dengan istilah teknis asli.

---

## 3. Keputusan Terkunci (jangan diubah tanpa persetujuan)

| Topik | Keputusan |
|---|---|
| Model | Self-hosted, **single-tenant** (satu owner per instalasi), banyak cabang (`branch_id`) |
| Distribusi | Seluruh kode sumber diberikan ke pelanggan |
| Lisensi | Tanpa license key. Hanya atribusi/lisensi branding di frontend + file `LICENSE` |
| Stack | Next.js (App Router, TypeScript) |
| Deployment | **Hanya Docker** (docker compose), konfigurasi otomatis |
| Mata uang | Rupiah saja |
| Pajak & lokalisasi | Dapat diatur Super Admin (tarif, inklusif/eksklusif, bahasa, zona waktu, format) |
| POS | Online-only, tidak perlu offline |
| Cetak | Browser print + PDF (tanpa driver printer/hardware khusus) |
| Pembayaran | Midtrans dan Xendit; pelanggan membayar dari aplikasi mereka (QRIS, e-wallet, VA, m-banking) |
| WhatsApp | Dua provider sebagai pilihan konfigurasi: WhatsApp Cloud API resmi dan gateway (mis. Fonnte) |
| Email | Resend (adapter dapat diperluas, SMTP sebagai opsi) |
| Struk/tagihan | Dikirim ke pelanggan lewat WhatsApp (email sebagai tambahan) |
| Komisi | Opsional (saklar owner), hanya **dicatat sebagai laporan**, tidak ada payout |
| Rekam medis | Lengkap dan dapat dikonfigurasi owner (form builder) |
| Portal pelanggan | Login, riwayat hewan, booking, tagihan dan pembayaran; PWA |
| Kredensial | Terpusat, hanya Owner/Super Admin yang boleh melihat/mengubah |
| Cakupan rilis | Semua modul masuk versi pertama |

---

## 4. Arsitektur

### 4.1 Stack

- **Web:** Next.js (App Router), TypeScript strict, React Server Components + Server Actions untuk mutasi internal, Route Handlers untuk webhook dan API portal.
- **UI:** Tailwind CSS + shadcn/ui (Radix), Framer Motion (halus, bukan berlebihan), TanStack Table, TanStack Query, React Hook Form + Zod, Recharts.
- **Database:** PostgreSQL + **Drizzle ORM** (migrasi SQL tersimpan di repo).
- **Cache/Queue:** Redis + **BullMQ**.
- **Worker:** container terpisah (`apps/worker`) untuk: kirim WhatsApp/email, retry, reminder terjadwal, rekonsiliasi pembayaran, laporan terjadwal, backup terjadwal.
- **Penyimpanan file:** volume lokal secara default; kompatibel S3 (MinIO/S3) sebagai opsi, lewat adapter storage.
- **PDF:** render server-side (HTML → PDF) untuk struk, invoice, sertifikat vaksin, surat sehat, laporan.
- **Realtime:** Server-Sent Events untuk antrian klinik, status pembayaran di POS, dan notifikasi.
- **i18n:** `next-intl` (id default, en).
- **Testing:** Vitest (unit), Postgres nyata untuk integration test, Playwright (e2e).

### 4.2 Struktur monorepo

```
petora/
├─ apps/
│  ├─ web/                 # Next.js: /admin (staf), /portal (pelanggan), /setup, /api
│  └─ worker/              # BullMQ workers + scheduler
├─ packages/
│  ├─ db/                  # skema Drizzle, migrasi, seed
│  ├─ core/                # domain logic & service layer (tanpa dependensi UI)
│  ├─ auth/                # sesi, hashing, OTP, dua realm (staff, customer)
│  ├─ rbac/                # katalog permission, evaluator can()
│  ├─ integrations/        # adapter payment, whatsapp, email, storage + registry
│  ├─ documents/           # template struk/invoice/sertifikat, penomoran, PDF
│  ├─ ui/                  # design system
│  └─ config/              # tsconfig, eslint, tailwind preset
├─ docker/                 # Dockerfile, compose, caddy, skrip init/backup/restore
├─ docs/                   # dokumentasi (Bagian 16)
├─ scripts/                # install.sh, upgrade.sh, backup.sh, restore.sh
├─ LICENSE
└─ AGENT.md
```

### 4.3 Prinsip arsitektur

- **Service layer tunggal** di `packages/core`. Server Actions, route handler, dan worker memanggil service yang sama. Tidak ada logika bisnis di komponen UI.
- **Otorisasi di server pada setiap operasi** lewat `can(actor, permission, { branchId, resource })`. UI hanya menyembunyikan; keamanan ada di server.
- **Scoping cabang di query layer**: helper wajib yang menambahkan filter `branch_id` sesuai hak akses aktor. Query tanpa helper dilarang untuk tabel ber-cabang (tambahkan lint/test untuk ini).
- **Uang = integer Rupiah (bigint)**. Dilarang `float`. Kebijakan pembulatan dikonfigurasi (per transaksi, per baris, kelipatan 100/500/1000).
- **Stok berbasis ledger**: tabel `stock_movements` append-only; saldo diturunkan dan di-cache. Mutasi dalam transaksi DB dengan row lock.
- **Dokumen keuangan immutable**: invoice yang sudah final tidak diedit; koreksi lewat void/refund/retur dengan jejak audit.
- **Rekam medis**: draft → final (terkunci) → koreksi lewat *addendum* berversi. Semua akses dan perubahan tercatat.
- **Audit log** untuk aksi sensitif: login, perubahan role/permission, perubahan integrasi, diskon di atas batas, void/refund, akses rekam medis, ekspor data.
- **Idempotensi** untuk webhook dan pembuatan pembayaran (idempotency key).
- **Soft delete** untuk master data; hard delete hanya untuk data sementara.
- **Zona waktu**: simpan UTC, tampilkan sesuai pengaturan (default `Asia/Jakarta`).
- **Penomoran dokumen** dapat dikonfigurasi per jenis dan per cabang, misalnya `INV/{BRANCH}/{YYYY}{MM}/{SEQ:5}`, dengan counter atomik di DB.

---

## 5. Multi-Cabang

- Satu `organization` (owner) dan banyak `branches`. Setiap cabang: nama, kode, alamat, kontak, jam operasional, zona waktu, header/footer struk, rekening/akun penerimaan, gudang.
- Entitas ber-cabang: gudang, stok, shift kasir, transaksi, janji temu, kunjungan klinik, rawat inap, kandang/kamar, jadwal staf, kas.
- Entitas global (lintas cabang): pelanggan, hewan, produk (master), layanan (master), template, role, integrasi. Harga dan ketersediaan dapat **di-override per cabang**.
- **Transfer stok antar cabang** dengan status: diminta → dikirim → diterima (selisih tercatat).
- **Laporan konsolidasi** (semua cabang) dan per cabang. Satu pelanggan dan satu rekam hewan berlaku di semua cabang (dengan kontrol akses rekam medis lintas cabang yang dapat dikonfigurasi).
- Staf dapat ditugaskan ke satu atau banyak cabang, **dengan role berbeda per cabang**.
- Pengaturan terpusat (integrasi, pajak default, branding, kebijakan) hanya dikelola Owner/Super Admin; cabang dapat meng-override hanya yang diizinkan (mis. header struk, jam operasional).

---

## 6. RBAC Fleksibel (Custom Role & Hak Akses)

### 6.1 Model

- **Permission** berformat `modul.sumber.aksi`, contoh: `pos.sale.create`, `pos.sale.void`, `pos.discount.override`, `inventory.stock.adjust`, `medical.record.edit`, `medical.record.view_internal_notes`, `finance.report.view`, `integration.config.manage`.
- Katalog permission **didefinisikan di kode** (`packages/rbac`) agar terversi, lalu disinkronkan ke DB saat migrasi. Setiap permission punya: kunci, modul, deskripsi (id/en), dan kategori risiko.
- **Role** disimpan di DB, **dibuat/diubah/diklon bebas** oleh Owner/Super Admin lewat UI. Role bawaan (sistem) ditandai dan sebagian terkunci.
- **Penugasan**: `user ↔ role ↔ cabang`. Satu pengguna dapat memiliki banyak role dan cakupan berbeda per cabang.
- **Cakupan data** per role: `semua cabang`, `cabang tertentu`, atau `hanya data sendiri`.
- **Batas numerik per role**: maksimum diskon (% dan nominal), batas refund, batas void tanpa approval, batas transaksi tunai.
- **Kebijakan approval**: aksi tertentu (void, refund, diskon besar, penyesuaian stok besar) dapat mewajibkan persetujuan PIN/otorisasi supervisor, dikonfigurasi per aksi.
- **Field-level**: permission khusus untuk menyembunyikan data sensitif (HPP/harga beli, margin, komisi orang lain, catatan internal medis, data kontak pelanggan).
- **Pengecualian per pengguna** (grant/deny tambahan di luar role) dengan alasan dan jejak audit.

### 6.2 UI manajemen

- Halaman role: daftar, buat, klon, bandingkan.
- **Matriks permission** (modul × aksi) dengan pencarian, filter, dan "pilih semua per modul".
- Pratinjau "Apa yang bisa dilakukan role ini" dan "Lihat sebagai role ini" (simulasi, tanpa mengubah data).
- Peringatan saat memberi permission berisiko tinggi.
- Perlindungan: role **Owner** tidak dapat dihapus/dikurangi; selalu ada minimal satu Owner aktif.

### 6.3 Role bawaan (template, dapat diubah/diklon)

Owner, Super Admin, Manajer Cabang, Kasir, Resepsionis, Dokter Hewan, Paramedis/Perawat, Groomer, Petugas Penitipan, Admin Gudang, Keuangan/Akuntan. Setiap role bawaan dilengkapi seed permission default yang masuk akal dan didokumentasikan di `docs/04-permissions.md`.

---

## 7. Sistem Integrasi (Tanpa Hardcode)

### 7.1 Prinsip

- Semua integrasi dikelola dari **UI Super Admin**: Pengaturan → Integrasi.
- **Pola adapter**: setiap provider mengimplementasikan interface kategori (`PaymentProvider`, `WhatsAppProvider`, `EmailProvider`, `StorageProvider`). Menambah provider baru = menambah adapter + skema form konfigurasi, tanpa mengubah modul bisnis.
- Setiap adapter mendeklarasikan **skema konfigurasi** (field, tipe, wajib, rahasia, bantuan) sehingga form UI dirender otomatis.
- **Kredensial terenkripsi** di DB (AES-256-GCM, envelope dengan master key dari environment/volume). Nilai rahasia **tidak pernah dikirim kembali ke browser** (hanya `••••` + tanda "tersimpan"); mengganti berarti menulis ulang.
- **Mode** sandbox/production per koneksi. **Tombol "Uji Koneksi"** dengan hasil jelas. **Status kesehatan** (terakhir sukses/gagal) di dashboard.
- Hanya Owner/Super Admin yang dapat melihat/mengubah (`integration.config.manage`). Setiap perubahan masuk audit log. Kredensial **tidak** ditampilkan di log, error, atau ekspor.
- Satu koneksi aktif per kategori sebagai *default*; dukungan **routing** (mis. WhatsApp resmi untuk template, gateway untuk pesan lain) dikonfigurasi di UI.
- Webhook URL per provider **ditampilkan otomatis** di UI untuk disalin ke dashboard provider.

### 7.2 Payment gateway (Midtrans, Xendit)

- Metode: QRIS, e-wallet, virtual account, dan metode lain yang didukung provider. Aktif/nonaktif per metode di konfigurasi.
- Alur: buat tagihan/charge via adapter → simpan `payment_attempt` → kirim link/QR/VA ke pelanggan (WhatsApp/portal) → pelanggan bayar di aplikasinya → **webhook** → verifikasi tanda tangan/token sesuai dokumentasi resmi → update status secara **idempoten** → invoice berubah status → picu pengiriman struk.
- Status: `pending`, `paid`, `expired`, `failed`, `cancelled`, `refunded`, `partially_paid`.
- **Rekonsiliasi terjadwal** di worker: periksa transaksi `pending` yang melewati batas ke API provider.
- Dukung pembayaran sebagian, kedaluwarsa, pembatalan, dan retry pembuatan link.
- Biaya gateway (MDR) dapat dicatat sebagai biaya dan dipakai di laporan keuangan.

### 7.3 WhatsApp (Cloud API + gateway)

- Dua adapter: **WhatsApp Cloud API resmi** dan **gateway pihak ketiga** (mis. Fonnte).
- **Manajemen template**: variabel (`{{nama}}`, `{{total}}`, `{{link_bayar}}`, dll.), pratinjau, status persetujuan (untuk Cloud API, sinkron dengan status template di Meta), pemetaan *event* → template.
- Pesan yang dimulai bisnis lewat Cloud API **wajib memakai template**; sistem harus menegakkan ini dan memberi pesan error yang jelas.
- Lampiran: struk/invoice PDF, sertifikat vaksin.
- **Antrian pengiriman** dengan retry/backoff, status (`queued/sent/delivered/read/failed`) dari webhook, log lengkap, dan penanganan opt-out.
- Dipakai juga untuk **OTP login portal** (dengan rate limit ketat).

### 7.4 Email (Resend)

- Adapter Resend; template email (HTML + teks), variabel, pratinjau, log pengiriman. SMTP generik sebagai adapter tambahan.

### 7.5 Lainnya

- Storage (lokal/S3), dan titik perluasan untuk integrasi masa depan (kurir, akuntansi, dsb.) tanpa mengubah inti.

---

## 8. Modul, Fitur, dan Fungsi

> Setiap modul wajib memiliki: daftar halaman, aksi, permission, validasi, state kosong/loading/error, dokumentasi pengguna, dan test.

### 8.1 Dashboard
- Ringkasan hari ini per cabang/semua cabang: penjualan, kunjungan klinik, antrian, janji temu, stok menipis/kedaluwarsa, tagihan jatuh tempo, pembayaran online pending.
- Widget dapat disusun ulang dan disembunyikan per pengguna; tampilan menyesuaikan permission.

### 8.2 POS (Point of Sale) — lengkap
- **Shift kasir:** buka/tutup shift, kas awal, kas masuk/keluar, rekap per metode bayar, selisih kas, laporan shift.
- **Keranjang:** pencarian cepat (nama/SKU/barcode lewat keyboard scanner), varian, satuan ganda, catatan per item, kuantitas desimal untuk produk curah, favorit/pintasan.
- **Item campuran:** produk, obat, layanan klinik, grooming, penitipan, paket/bundel dalam satu keranjang/tagihan.
- **Pelanggan & hewan:** pilih/daftarkan cepat, kaitkan item ke hewan tertentu.
- **Harga:** harga bertingkat, harga per cabang, harga member, jadwal promo.
- **Diskon:** per item, per transaksi, voucher, promo otomatis, member; dibatasi oleh batas diskon role; override butuh approval.
- **Pajak:** sesuai konfigurasi (inklusif/eksklusif, per item/kategori), biaya layanan opsional, pembulatan.
- **Pembayaran:** tunai (kembalian), transfer manual, EDC/kartu (pencatatan), QRIS/e-wallet/VA via gateway, **split payment**, uang muka/deposit, saldo/kredit pelanggan, piutang/cicilan dengan jatuh tempo.
- **Pembayaran online:** buat link/QR dari POS, tampilkan QR di layar, status real-time (SSE), kirim link ke WhatsApp pelanggan.
- **Hold/resume** transaksi, antrean kasir, transaksi dari kunjungan klinik/grooming/penitipan yang "menunggu pembayaran".
- **Void, refund, retur:** parsial/penuh, alasan wajib, approval sesuai kebijakan, stok dan komisi menyesuaikan otomatis.
- **Struk & dokumen:** struk 58/80 mm dan A4 lewat cetak browser + PDF, invoice, tanda terima, **kirim via WhatsApp** otomatis/manual (dan email), cetak ulang dengan penanda "salinan".
- **Poin/loyalitas** dan **voucher/gift card** (dapat diaktifkan owner).
- **Pintasan keyboard** lengkap dan layout ramah tablet.
- **Komisi:** setiap item dapat ditautkan ke staf pelaksana/penjual (jika fitur komisi aktif).

### 8.3 Pelanggan & Hewan (CRM)
- Pelanggan: data kontak (normalisasi nomor +62), alamat, tag, catatan, preferensi notifikasi, persetujuan (consent), riwayat transaksi, saldo/piutang, member/poin.
- Hewan: spesies, ras, nama, jenis kelamin, tanggal lahir/perkiraan umur, warna, microchip, foto, status steril, alergi, riwayat berat, catatan perilaku, kepemilikan lebih dari satu pemilik, status (aktif/meninggal/dipindahkan).
- Deteksi dan **penggabungan duplikat**, impor/ekspor, pencarian cepat lintas nama/nomor/microchip.

### 8.4 Produk & Inventori
- Master produk: SKU, barcode (banyak), kategori hierarkis, merek, deskripsi, foto, varian, satuan dasar + konversi satuan, jenis (barang, obat, pakan, aksesoris, jasa), status obat/golongan, aturan resep.
- Harga: beli, jual, bertingkat, per cabang; **HPP** (average/FIFO, dikonfigurasi).
- **Multi-gudang per cabang**, batch/lot, **tanggal kedaluwarsa**, aturan FEFO.
- Pengadaan: supplier, permintaan pembelian, **purchase order**, **penerimaan barang (GRN)** dengan cek batch/expiry, retur ke supplier, hutang supplier.
- **Transfer antar gudang/cabang**, **stok opname** (sesi, hitung, selisih, persetujuan), penyesuaian dengan alasan, kartu stok, valuasi stok.
- Peringatan stok minimum, saran reorder, laporan kedaluwarsa dan slow-moving.
- Bundel/paket dan **resep komposisi** (mis. obat racikan) yang memotong bahan otomatis.
- Cetak label/barcode lewat PDF.
- Pemotongan stok otomatis dari POS, obat resep klinik, dan pemakaian bahan layanan (grooming/tindakan).

### 8.5 Klinik Hewan
- **Registrasi & antrian:** pendaftaran kunjungan, nomor antrian, triase/prioritas, status real-time, penugasan dokter/paramedis.
- **Pemeriksaan (rekam medis):**
  - Tanda vital, berat badan, BCS, suhu, keluhan utama, anamnesis.
  - **SOAP** terstruktur, diagnosa (master + bebas), diagnosa banding, prognosis.
  - Tindakan/prosedur (tertaut ke layanan berbiaya), pemakaian bahan.
  - **Resep & dispensing** obat (dosis, aturan pakai, potong stok FEFO, label obat PDF).
  - Lampiran foto/dokumen, hasil lab, imaging.
  - Rencana tindak lanjut/kontrol, rujukan.
- **Form builder rekam medis (dikonfigurasi owner):** bagian, field (teks, angka, pilihan, centang, tanggal, tabel, unggah, tanda tangan), aturan wajib/kondisional, **template per jenis layanan** (umum, vaksin, bedah, dental, dsb.), versi template. Inti data tetap terstruktur; field dinamis disimpan JSONB.
- **Visibilitas ke portal** diatur per field/bagian oleh owner.
- **Vaksinasi & pencegahan:** jadwal vaksin, deworming, anti kutu/caplak; protokol per spesies/umur; pencatatan batch vaksin; **sertifikat vaksin PDF**; pengingat otomatis.
- **Laboratorium & penunjang:** permintaan, input hasil (nilai, satuan, rentang normal, flag), unggah file, riwayat tren.
- **Rawat inap:** manajemen kandang/ruang, admisi/discharge, **CPPT/observasi berkala**, jadwal pemberian obat/infus (checklist), pakan, biaya harian otomatis ke tagihan.
- **Bedah & anestesi:** persetujuan tindakan (informed consent dengan tanda tangan digital), catatan pra-bedah, catatan anestesi, laporan operasi, pemantauan pasca-bedah.
- **Dokumen:** surat sehat, surat keterangan, rujukan, ringkasan medis, informed consent (PDF dari template yang dapat diedit).
- Pengunci rekam medis (final) + addendum; riwayat versi; log akses.

### 8.4b Grooming
- Master layanan dan paket (per ukuran/ras/berat), durasi, bahan terpakai.
- Jadwal groomer, workflow status (terjadwal → check-in → proses → selesai → dijemput), foto sebelum/sesudah, catatan perilaku/kondisi kulit, add-on, notifikasi "hewan siap dijemput" via WhatsApp.

### 8.5b Penitipan (Boarding/Daycare)
- Master kamar/kandang (tipe, kapasitas, tarif per hari/jam), ketersediaan kalender.
- Reservasi, check-in/check-out, serah terima kondisi hewan, **log harian** (makan, minum, eliminasi, aktivitas, obat), foto/update ke pemilik, deposit, biaya otomatis per malam + add-on, aturan vaksin wajib sebelum menitip.

### 8.6 Janji Temu & Penjadwalan
- Kalender per dokter, groomer, kamar, dan resource; jam kerja, libur, cuti, slot dan durasi per layanan, buffer.
- Booking oleh staf dan oleh pelanggan (portal), **konfirmasi otomatis atau manual per layanan**, deposit opsional lewat gateway, penjadwalan ulang/pembatalan dengan kebijakan, **no-show** tracking, daftar tunggu.
- Pengingat otomatis via WhatsApp/email.

### 8.7 Keuangan
- Kas & bank, akun penerimaan per metode bayar, biaya operasional (kategori, lampiran), pembelian dan **hutang supplier**, **piutang pelanggan**, pembayaran hutang/piutang.
- Jurnal sederhana otomatis dari transaksi (penjualan, pembelian, biaya, refund), **laba rugi**, **arus kas**, neraca sederhana, penutupan periode.
- Pajak (PPN dsb.) sesuai konfigurasi, rekap pajak.
- Biaya gateway tercatat; rekonsiliasi pembayaran online.

### 8.8 Komisi (Opsional)
- **Saklar global** oleh owner. Jika mati: tidak ada perhitungan, menu tersembunyi.
- **Aturan:** per staf, per peran, per kategori produk/layanan, per item; persen atau nominal; basis omzet atau laba; **target bertingkat** (tier); pembagian antar beberapa staf pada satu item; batas minimum/maksimum; periode berlaku.
- **Siklus:** `pending` (belum lunas) → `final` (lunas) → `reversal` otomatis saat void/refund/retur.
- **Hanya laporan**: per staf, per periode, per cabang, per kategori, rincian transaksi, ekspor CSV/XLSX/PDF. **Tidak ada fitur payout/pembayaran gaji.**
- Staf hanya melihat komisinya sendiri kecuali punya permission lebih.

### 8.9 SDM Dasar
- Profil staf, penugasan cabang, jadwal shift, absensi sederhana (check-in/out), cuti dasar, sertifikasi/STR dokter (dengan pengingat kedaluwarsa).

### 8.10 Komunikasi & Notifikasi
- Mesin notifikasi berbasis **event → template → kanal** yang dikonfigurasi di UI.
- Event minimal: struk/tagihan terbit, pembayaran berhasil/kedaluwarsa, booking dibuat/dikonfirmasi/diingatkan/dibatalkan, jadwal vaksin mendekati, hewan siap dijemput, hasil lab tersedia, ulang tahun hewan, tindak lanjut pasca-kunjungan, stok menipis (internal), OTP.
- Kanal: WhatsApp, email, notifikasi dalam aplikasi, push PWA (opsional).
- Log, retry, opt-out, jam tenang (quiet hours), dan antrian rate-limited.

### 8.11 Laporan
- Penjualan (harian, per kasir, per produk/kategori, per metode bayar, per cabang), laba/margin, stok & valuasi, kedaluwarsa, pembelian, klinik (kunjungan, diagnosa, tindakan, dokter), grooming, penitipan, vaksinasi, piutang/hutang, komisi, keuangan, audit.
- Filter fleksibel, **saved views**, ekspor CSV/XLSX/PDF, **laporan terjadwal** yang dikirim otomatis.

### 8.12 Pengaturan Super Admin
- **Profil bisnis & branding:** nama aplikasi, logo, favicon, warna aksen, tema (atribusi PETORA tetap terkunci).
- **Cabang & gudang**, **penomoran dokumen**, **pajak**, **lokalisasi** (bahasa, zona waktu, format tanggal/angka), **template dokumen** (struk, invoice, sertifikat, surat) dengan editor dan pratinjau.
- **Integrasi** (Bagian 7), **template pesan**, **form builder rekam medis**, **kebijakan** (approval, diskon, refund, retensi data, booking, deposit), **feature flags** per modul (mis. komisi, loyalitas, rawat inap).
- **Role & hak akses**, pengguna, sesi aktif, 2FA.
- **Audit log**, **kesehatan sistem** (DB, Redis, antrian, integrasi, disk), **impor/ekspor data**, **backup/restore** dari UI (picu dan unduh), info versi dan cek update.

---

## 9. Portal Pelanggan (PWA)

- Area terpisah (`/portal`), **autentikasi terpisah** dari staf, tanpa akses ke sistem role staf.
- **Login:** OTP WhatsApp (nomor HP) sebagai utama; email + password/magic link sebagai opsi. Rate limit, batas percobaan, proteksi bot (mis. Turnstile opsional), log akses.
- **Pendaftaran mandiri** dapat diaktifkan/nonaktifkan owner; pelanggan yang sudah terdaftar staf dapat mengklaim akun lewat verifikasi nomor.
- **Fitur:** profil, daftar hewan (tambah/ubah terbatas), **riwayat kunjungan**, **vaksinasi & jadwal berikutnya**, hasil dan dokumen yang diizinkan (sertifikat vaksin, resep, ringkasan), **tagihan & pembayaran** (QRIS/e-wallet/VA via gateway), riwayat pembayaran dan struk, **booking** (layanan, cabang, dokter/groomer, tanggal/jam), jadwal ulang/batal, status penitipan/grooming dengan foto/update, notifikasi, pengaturan preferensi.
- **Satu akun berlaku di semua cabang**; pelanggan memilih cabang saat booking.
- **Booking dikonfigurasi per layanan:** otomatis terkonfirmasi, atau perlu konfirmasi staf; deposit opsional.
- **Privasi:** hanya field yang diizinkan owner yang tampil; catatan internal dokter tidak pernah tampil.
- PWA: dapat dipasang, ikon dan tema mengikuti branding, aman dan cepat di HP, state kosong dan error yang ramah.

---

## 10. Autentikasi & Keamanan

- Hash **Argon2id**; sesi berbasis cookie httpOnly/secure/sameSite; dua realm (staff, customer); pencabutan sesi; daftar perangkat/sesi aktif.
- **2FA TOTP** (wajib bisa diaktifkan; dapat diwajibkan untuk role tertentu).
- **PIN supervisor** untuk approval POS (di-hash, rate-limited).
- Rate limit (login, OTP, API portal, webhook), proteksi brute force, CSRF, header keamanan (CSP, HSTS, dll.), validasi input Zod di semua batas, sanitasi output.
- Validasi unggahan file (tipe, ukuran, pemindaian dasar), penyimpanan di luar webroot, akses lewat URL bertanda tangan.
- Enkripsi rahasia di DB (Bagian 7), tidak ada rahasia di bundle klien, log tanpa data sensitif.
- Verifikasi webhook wajib; endpoint webhook tidak memakai sesi.
- Kebijakan retensi dan anonimisasi data; ekspor data pelanggan; log akses data pribadi (hormati UU PDP Indonesia sebagai panduan).
- Dokumentasikan model ancaman dan mitigasi di `docs/09-security.md`.

---

## 11. Docker & Deployment (Konfigurasi Otomatis)

### 11.1 Layanan (docker compose)

| Layanan | Fungsi |
|---|---|
| `caddy` | Reverse proxy, HTTPS otomatis (Let's Encrypt) atau TLS internal untuk lokal |
| `web` | Next.js (staf, portal, API, webhook) |
| `worker` | BullMQ workers dan scheduler |
| `postgres` | Database (volume persisten) |
| `redis` | Queue/cache |
| `init` | Job satu kali: buat rahasia, jalankan migrasi, seed katalog permission |
| `minio` | Opsional (profile) untuk S3-compatible storage |
| `backup` | Backup terjadwal DB + file + kunci |

### 11.2 Perilaku otomatis

- `docker compose up -d` (atau `./scripts/install.sh`) pada instalasi baru harus:
  1. Membuat rahasia (`AUTH_SECRET`, kunci enkripsi master, password DB/Redis) dan menyimpannya di volume `secrets` bila belum ada. **Tidak ada langkah manual menyalin kunci.**
  2. Menjalankan migrasi database dan seed katalog permission/role bawaan.
  3. Menyalakan semua layanan dengan **healthcheck** dan urutan `depends_on` yang benar.
  4. Mengarahkan ke **Setup Wizard** saat pertama kali dibuka.
- **Setup Wizard** (hanya jalan jika belum terinisialisasi): akun Owner, profil bisnis, cabang pertama, zona waktu/bahasa/pajak, pengecekan domain/HTTPS/port 80-443 (penting untuk webhook), uji koneksi DB/Redis, opsi isi data contoh. Setelah selesai, wizard terkunci permanen.
- Hanya variabel minimal yang perlu diisi pengguna (mis. `PETORA_DOMAIN`, email untuk sertifikat). Sisanya otomatis; semua variabel terdokumentasi di `.env.example`.
- **Image berversi** (tag semver); migrasi otomatis saat start; **`scripts/upgrade.sh`** mem-backup dulu, menarik image baru, migrasi, verifikasi kesehatan, dan **rollback** bila gagal.
- **`scripts/backup.sh` / `restore.sh`**: backup DB, file unggahan, **dan kunci enkripsi** (dengan peringatan jelas: tanpa kunci, kredensial integrasi tidak bisa dibaca). Uji restore didokumentasikan.
- Image produksi multi-stage, non-root, kecil, tanpa dev dependency. Log ke stdout terstruktur; rotasi log.
- Dukung mode lokal/LAN (tanpa domain publik) dengan peringatan bahwa webhook gateway dan WhatsApp Cloud API membutuhkan domain publik HTTPS.

---

## 12. Frontend: Modern, Tidak Kaku

**Prinsip:** profesional, hangat, cepat. Bukan template dashboard generik.

- **Identitas visual** bertema hewan peliharaan namun dewasa: palet warna dengan satu warna aksen yang dapat diubah owner, tipografi yang jelas, ilustrasi/ikon ramah untuk state kosong, tanpa terkesan kekanak-kanakan.
- **Tema:** terang/gelap/otomatis, kepadatan tampilan (nyaman/ringkas), warna aksen dari branding.
- **Navigasi:** sidebar yang dapat dilipat, **command palette (Ctrl/Cmd+K)** untuk pindah halaman dan aksi cepat, breadcrumb, pergantian cabang yang menonjol, pencarian global (pelanggan, hewan, produk, transaksi).
- **Interaksi:** animasi halus dan bermakna (transisi halaman, drawer, kartu), skeleton loader, optimistic update, toast, konfirmasi aksi berbahaya, undo bila mungkin.
- **Tabel data:** kolom dapat diatur, filter, **saved views**, ekspor, pagination/virtualisasi untuk data besar.
- **POS:** layout dua panel yang ramah tablet dan layar sentuh, target sentuh besar, pintasan keyboard, kontras tinggi, nyaman dipakai lama.
- **Dashboard** dengan widget yang dapat diatur pengguna.
- **Responsif penuh** (HP, tablet, desktop); portal pelanggan **mobile-first**.
- **Aksesibilitas:** WCAG AA, navigasi keyboard, fokus terlihat, label ARIA, dukung *reduced motion*.
- **Performa:** target LCP cepat, code splitting, gambar dioptimalkan, tidak ada layout shift.
- **Konsistensi:** semua komponen berasal dari `packages/ui`, didokumentasikan (katalog komponen), dengan token desain terpusat.
- Footer atribusi PETORA INDONESIA konsisten di panel staf, portal, dan dokumen cetak (tidak mengganggu, tidak dapat dimatikan).

---

## 13. Model Data (Garis Besar)

Agent membuat ERD lengkap (Mermaid) di `docs/03-erd.md`. Domain tabel minimum:

- **Inti:** `organization`, `branches`, `users`, `staff_profiles`, `sessions`, `roles`, `permissions`, `role_permissions`, `user_role_assignments`, `user_permission_overrides`, `approval_policies`, `audit_logs`, `settings`, `feature_flags`, `document_sequences`, `files`.
- **Integrasi:** `integration_connections` (terenkripsi), `integration_routes`, `webhook_events`, `message_templates`, `notification_rules`, `outbound_messages`, `notification_inbox`.
- **CRM:** `customers`, `customer_accounts` (portal), `pets`, `pet_owners`, `pet_weights`, `consents`.
- **Katalog & stok:** `products`, `product_variants`, `product_barcodes`, `categories`, `brands`, `units`, `unit_conversions`, `price_lists`, `branch_prices`, `warehouses`, `stock_batches`, `stock_movements`, `stock_balances`, `suppliers`, `purchase_orders`, `goods_receipts`, `stock_transfers`, `stock_opnames`, `bundles`, `recipes`.
- **Layanan:** `services`, `service_packages`, `resources` (dokter/groomer/ruang), `rooms_cages`.
- **Transaksi:** `cashier_shifts`, `cash_movements`, `invoices`, `invoice_items`, `payments`, `payment_attempts`, `refunds`, `vouchers`, `loyalty_ledgers`, `receivables`, `payables`.
- **Klinik:** `visits`, `queue_tickets`, `medical_records`, `medical_record_versions`, `diagnoses`, `procedures`, `prescriptions`, `prescription_items`, `lab_orders`, `lab_results`, `vaccinations`, `vaccine_protocols`, `admissions`, `observations`, `medication_schedules`, `surgeries`, `consent_forms`, `form_templates`, `form_template_versions`.
- **Operasional:** `appointments`, `availability_rules`, `time_off`, `grooming_jobs`, `boarding_reservations`, `boarding_daily_logs`, `work_schedules`, `attendance`.
- **Keuangan & komisi:** `accounts`, `journal_entries`, `expenses`, `commission_rules`, `commission_entries`, `period_closings`.

Aturan: UUID v7 sebagai primary key, `created_at/updated_at/deleted_at`, `branch_id` di tabel ber-cabang, indeks untuk jalur kueri utama, constraint integritas (FK, check) sebagai pertahanan kedua.

---

## 14. Kualitas & Pengujian

- **Unit test** untuk logika inti: harga/pajak/pembulatan, diskon, komisi, stok (FEFO/HPP), RBAC evaluator, penomoran, verifikasi webhook.
- **Integration test** dengan Postgres nyata: transaksi POS end-to-end, konkurensi stok, idempotensi webhook, scoping cabang (uji bahwa data cabang lain tidak bocor).
- **Kontrak adapter**: suite test yang sama dijalankan terhadap mock tiap provider; simulasi webhook sukses/gagal/duplikat/kedaluwarsa.
- **E2E (Playwright):** setup wizard, login staf/portal (OTP), alur POS lengkap, kunjungan klinik sampai tagihan, booking portal sampai pembayaran, pembuatan role kustom dan efeknya, install/upgrade Docker.
- **Keamanan:** uji otorisasi (setiap endpoint ditolak tanpa permission), rate limit, validasi unggahan, cek dependensi rentan.
- **Aksesibilitas dan performa:** pemeriksaan otomatis di CI.
- **Seed demo** yang realistis (dua cabang, staf, produk, hewan, riwayat) untuk demo dan pengujian.
- Target cakupan test untuk `packages/core` dan `packages/rbac` tinggi dan dijaga di CI.

---

## 15. Standar Kode

- TypeScript `strict`, ESLint + Prettier, tanpa `any` tanpa alasan tertulis, import boundary antar package ditegakkan lint.
- Komponen kecil, nama jelas, tidak ada logika bisnis di UI.
- Error ditangani eksplisit dengan pesan ramah pengguna (id/en); tidak menelan error.
- Semua string UI lewat i18n.
- Migrasi DB hanya maju (forward-only), dapat diulang aman, ditinjau, dan diuji.
- Dependensi dijaga minimal dan dikunci versinya.

---

## 16. Dokumentasi yang Wajib Dihasilkan

```
docs/
├─ 00-overview.md            # visi, ruang lingkup, glosarium
├─ 01-prd.md                 # kebutuhan per modul, alur pengguna
├─ 02-architecture.md        # arsitektur, diagram komponen, keputusan
├─ 03-erd.md                 # ERD (Mermaid) + kamus data
├─ 04-permissions.md         # katalog permission + matriks role bawaan
├─ 05-integrations.md        # adapter, skema konfigurasi, alur webhook, rujukan docs resmi
├─ 06-api.md                 # route handler, webhook, API portal
├─ 07-ui-ux.md               # design system, peta halaman, alur, wireframe tekstual
├─ 08-deployment.md          # Docker, instalasi, upgrade, backup/restore, troubleshooting
├─ 09-security.md            # model ancaman, kontrol, kebijakan data
├─ 10-testing.md             # strategi dan cara menjalankan test
├─ 11-user-guide/            # panduan pengguna per peran (owner, kasir, dokter, groomer, gudang, pelanggan)
├─ 12-admin-guide.md         # panduan Super Admin (integrasi, role, form builder, branding)
├─ adr/                      # catatan keputusan arsitektur
├─ PROGRESS.md               # checklist fase dan modul
└─ CHANGELOG.md
```
Juga: `README.md` (instalasi cepat), `CONTRIBUTING.md`, `.env.example`, dan **`LICENSE`**.

**LICENSE:** buat lisensi kustom yang (a) mengizinkan penggunaan dan modifikasi kode, (b) mewajibkan atribusi "PETORA INDONESIA" dan pemberitahuan hak cipta tetap ada pada UI dan dokumen cetak, (c) mengizinkan penggantian nama/branding aplikasi, (d) menyatakan hak cipta tetap milik PETORA INDONESIA. Tandai bahwa teks perlu **ditinjau penasihat hukum** sebelum distribusi.

---

## 17. Roadmap Berbasis Fase

> Tidak ada tanggal atau estimasi waktu. Setiap fase selesai ketika **Gerbang Keluar**-nya terpenuhi. Semua modul tetap masuk rilis pertama.

### Fase 0 — Fondasi Dokumentasi
**Tujuan:** rancangan lengkap sebelum kode.
- Hasilkan `docs/00` sampai `docs/10` (versi awal), ERD, katalog permission, peta halaman UI, spesifikasi adapter integrasi (setelah membaca dokumentasi resmi tiap provider).
- Siapkan `PROGRESS.md` dengan seluruh fase dan modul sebagai checklist.
- Draft `LICENSE`.
**Gerbang keluar:** dokumen konsisten satu sama lain, setiap modul di Bagian 8 punya kebutuhan, permission, dan entitas data yang terdefinisi.

### Fase 1 — Fondasi Teknis
**Tujuan:** kerangka proyek yang dapat dibangun dan dijalankan.
- Monorepo, tooling (lint, format, typecheck, test), CI.
- Dockerfile, compose dasar (web, worker, postgres, redis, caddy), healthcheck.
- Paket `db` (Drizzle, migrasi awal), `ui` (token desain, komponen dasar), i18n, layout dasar, tema.
**Gerbang keluar:** `docker compose up` menampilkan halaman dasar; CI hijau; migrasi berjalan otomatis.

### Fase 2 — Platform Inti
**Tujuan:** semua yang dibutuhkan modul bisnis.
- Autentikasi dua realm, sesi, 2FA, rate limit.
- **RBAC penuh:** katalog permission, role kustom, penugasan per cabang, batas numerik, approval, UI matriks, "lihat sebagai".
- Multi-cabang, pengaturan, branding + atribusi terkunci, penomoran dokumen, feature flags, audit log.
- **Kerangka integrasi:** registry adapter, form konfigurasi dinamis, enkripsi kredensial, uji koneksi, webhook ingest + idempotensi.
- Adapter **WhatsApp (Cloud API + gateway)** dan **Resend**, mesin notifikasi + antrian worker + template.
- Storage file, mesin dokumen/PDF.
- **Setup Wizard**, otomatisasi rahasia/migrasi/seed di Docker.
**Gerbang keluar:** instalasi bersih → wizard → owner membuat role kustom, cabang, mengonfigurasi WhatsApp dan email dari UI, dan mengirim pesan uji; test RBAC dan scoping cabang hijau.

### Fase 3 — Data Induk
- Pelanggan, hewan, staf, supplier, kategori/merek/satuan, produk dan varian, layanan dan paket, resource, kamar/kandang, pajak, metode bayar.
- Impor/ekspor, pencarian global, penggabungan duplikat.
**Gerbang keluar:** semua master dapat dikelola penuh sesuai permission; impor CSV berfungsi; test hijau.

### Fase 4 — Inventori & Pengadaan
- Gudang, batch/expiry, ledger stok, PO, GRN, retur supplier, transfer, opname, penyesuaian, HPP, kartu stok, alert, bundel/resep, label barcode PDF.
**Gerbang keluar:** uji konkurensi stok lulus; valuasi dan kartu stok akurat; laporan stok dan kedaluwarsa berfungsi.

### Fase 5 — POS & Pembayaran
- Shift kasir, keranjang, diskon/pajak/pembulatan, multi-metode dan split payment, hold/resume, void/refund/retur dengan approval, piutang, deposit, voucher, poin.
- Adapter **Midtrans** dan **Xendit**: charge, QRIS/e-wallet/VA, webhook terverifikasi, rekonsiliasi, status real-time.
- Struk/invoice cetak browser + PDF, **kirim via WhatsApp/email**, tagihan gabungan dari kunjungan klinik/layanan (antarmuka "menunggu pembayaran").
**Gerbang keluar:** transaksi end-to-end termasuk bayar via sandbox gateway, webhook duplikat/terlambat ditangani, struk terkirim ke WhatsApp; test e2e POS hijau.

### Fase 6 — Klinik Inti
- Registrasi dan antrian real-time, pemeriksaan SOAP, diagnosa, tindakan, resep dan dispensing (potong stok), lampiran, **form builder** + template, pengunci dan addendum, visibilitas portal per field.
- Vaksinasi dan protokol, sertifikat PDF, lab dan penunjang, dokumen (surat sehat, rujukan).
- Integrasi ke tagihan POS.
**Gerbang keluar:** satu kunjungan penuh: daftar → periksa → resep → vaksin → tagihan → bayar → struk WhatsApp; owner membuat template baru tanpa mengubah kode.

### Fase 7 — Layanan Lanjutan & Penjadwalan
- Rawat inap (CPPT, jadwal obat, biaya harian), bedah dan informed consent digital.
- Grooming (workflow, foto), penitipan (reservasi, log harian, biaya otomatis).
- Kalender, ketersediaan, janji temu, daftar tunggu, no-show.
**Gerbang keluar:** semua layanan menghasilkan item tagihan otomatis; konflik jadwal tercegah; test hijau.

### Fase 8 — Keuangan, Komisi, Laporan
- Kas/bank, biaya, hutang/piutang, jurnal otomatis, laba rugi, arus kas, neraca sederhana, penutupan periode, rekap pajak.
- **Komisi** lengkap (aturan, tier, split, siklus pending/final/reversal) di balik saklar owner; laporan komisi.
- Seluruh laporan Bagian 8.11, saved views, ekspor, laporan terjadwal.
**Gerbang keluar:** angka laporan cocok dengan data transaksi (uji rekonsiliasi); komisi berubah benar saat refund; saklar komisi mati menyembunyikan semuanya.

### Fase 9 — Portal Pelanggan
- Autentikasi OTP WhatsApp, klaim akun, pendaftaran mandiri (opsional).
- Profil, hewan, riwayat, vaksinasi, dokumen, tagihan dan pembayaran gateway, booking multi-cabang dengan deposit opsional, status layanan, notifikasi, PWA.
**Gerbang keluar:** pelanggan mendaftar → booking → bayar deposit dari aplikasi bank/e-wallet → hadir → melihat riwayat; uji privasi (tidak ada kebocoran data antar pelanggan atau catatan internal).

### Fase 10 — Otomatisasi & SDM
- Reminder terjadwal (vaksin, booking, tagihan, ulang tahun, follow-up), aturan notifikasi di UI, quiet hours, opt-out.
- SDM dasar: jadwal, absensi, cuti, pengingat STR.
- Dashboard dan widget kustom, pencarian global, command palette penuh.
**Gerbang keluar:** pengingat terkirim tepat dan tidak duplikat; seluruh pintasan dan palet berfungsi.

### Fase 11 — Pengerasan & Kualitas
- Audit keamanan menyeluruh (otorisasi setiap endpoint, rate limit, unggahan, header), uji penetrasi dasar internal, perbaikan temuan.
- Performa (indeks, kueri, caching), aksesibilitas, polesan UI/animasi, penanganan state kosong/error di semua halaman.
- Cakupan test final, uji beban POS, uji restore backup.
**Gerbang keluar:** semua suite hijau; tidak ada temuan keamanan tinggi terbuka; pemeriksaan a11y lulus.

### Fase 12 — Pengemasan & Rilis
- Finalisasi `install.sh`, `upgrade.sh` (+rollback), `backup.sh`, `restore.sh`; uji instalasi bersih dan upgrade dari versi sebelumnya pada mesin baru.
- Dokumentasi pengguna dan admin selesai, `.env.example`, `README`, `LICENSE` final, `CHANGELOG`.
- Seed demo, katalog komponen, versi 1.0.0 dengan image bertag.
**Gerbang keluar:** pengguna baru dapat memasang dari nol hanya dengan Docker mengikuti README, menyelesaikan wizard, dan menjalankan seluruh alur utama tanpa menyentuh kode.

---

## 18. Definition of Done (Berlaku untuk Setiap Fitur)

- [ ] Berfungsi end-to-end (UI → server → DB → efek samping).
- [ ] Otorisasi server-side dengan permission yang benar dan scoping cabang.
- [ ] Validasi input dan pesan error ramah (id/en).
- [ ] State kosong, loading, dan error ditangani.
- [ ] Audit log untuk aksi sensitif.
- [ ] Test unit/integrasi (dan e2e untuk alur kritis) lulus.
- [ ] Responsif dan aksesibel.
- [ ] Dokumentasi teknis dan panduan pengguna diperbarui.
- [ ] Tidak ada hardcode, `TODO`, atau data palsu.
- [ ] `PROGRESS.md` diperbarui.

---

## 19. Larangan

- Jangan hardcode kredensial, tarif pajak, nama bisnis, URL provider, atau daftar role.
- Jangan mengirim rahasia integrasi ke browser atau mencatatnya di log.
- Jangan membuat tombol atau menu yang tidak berfungsi.
- Jangan melewati pengecekan permission di server karena "UI sudah menyembunyikan".
- Jangan memakai `float` untuk uang.
- Jangan mengubah invoice final secara langsung; gunakan void/refund/retur.
- Jangan menambah fitur payout komisi (komisi hanya laporan).
- Jangan menyediakan cara menonaktifkan atribusi PETORA INDONESIA di UI.
- Jangan melewati gerbang fase.

---

## 20. Mulai dari Sini

1. Baca dokumen ini sampai habis.
2. Buat struktur repo (Bagian 4.2) dan `docs/PROGRESS.md`.
3. Kerjakan **Fase 0**: hasilkan dokumentasi rancangan, minta peninjauan pemilik proyek bila ada keputusan bisnis yang tidak bisa diturunkan dari dokumen ini.
4. Lanjutkan fase demi fase sampai **Fase 12** selesai dan semua gerbang lolos.
