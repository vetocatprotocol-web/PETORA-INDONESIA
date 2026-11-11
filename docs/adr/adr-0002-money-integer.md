# ADR-0002: Uang = Integer Rupiah (bigint)

## Status
Disetujui (Fase 0)

## Konteks
Perlu presisi uang tanpa presisi hilang dari float.

## Keputusan
Semua nilai uang disimpan sebagai integer Rupiah (bigint). Dilarang float. Kebijakan pembulatan dikonfigurasi (per transaksi, per baris, kelipatan 100/500/1000).

## Konsekuensi
- Semua perhitungan harga/pajak/diskon menggunakan integer.
- Tampilan membangun format rupiah dari integer.