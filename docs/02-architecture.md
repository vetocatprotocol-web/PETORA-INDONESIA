# 02 — Architecture

## Stack
- Web: Next.js (App Router), TypeScript strict, React Server Components + Server Actions (mutasi internal), Route Handlers (webhook & API portal).
- UI: Tailwind CSS + shadcn/ui (Radix), Framer Motion, TanStack Table, TanStack Query, React Hook Form + Zod, Recharts.
- Database: PostgreSQL + Drizzle ORM (migrasi SQL di repo).
- Cache/Queue: Redis + BullMQ.
- Worker: container terpisah (`apps/worker`) untuk WhatsApp/email, retry, reminder terjadwal, rekonsiliasi pembayaran, laporan terjadwal, backup terjadwal.
- File storage: volume lokal default; kompatibel S3 (MinIO/S3) opsi lewat adapter storage.
- PDF: HTML → PDF server-side.
- Realtime: Server-Sent Events.
- i18n: next-intl (id default, en).
- Testing: Vitest (unit), Postgres nyata (integration), Playwright (e2e).

## Struktur Monorepo
```
petora/
├─ apps/
│  ├─ web/                 # Next.js: /admin, /portal, /setup, /api
│  └─ worker/              # BullMQ workers + scheduler
├─ packages/
│  ├─ db/                  # skema Drizzle, migrasi, seed
│  ├─ core/                # domain logic & service layer
│  ├─ auth/                # sesi, hashing, OTP, dua realm
│  ├─ rbac/                # katalog permission, evaluator can()
│  ├─ integrations/        # adapter payment, whatsapp, email, storage + registry
│  ├─ documents/           # template struk/invoice/sertifikat, penomoran, PDF
│  ├─ ui/                  # design system
│  └─ config/              # tsconfig, eslint, tailwind preset
├─ docker/                 # Dockerfile, compose, caddy, skrip init/backup/restore
├─ docs/                   # dokumentasi
├─ scripts/                # install.sh, upgrade.sh, backup.sh, restore.sh
├─ LICENSE
└─ AGENT.md
```

## Prinsip Arsitektur
1. **Service layer tunggal** di `packages/core`. Server Actions, route handler, dan worker memanggil service yang sama. Tidak ada logika bisnis di komponen UI.
2. **Otorisasi di server** pada setiap operasi lewat `can(actor, permission, { branchId, resource })`. UI hanya menyembunyikan; keamanan ada di server.
3. **Scoping cabang di query layer**: helper wajib menambahkan filter `branch_id`. Query tanpa helper dilarang untuk tabel ber-cabang.
4. **Uang = integer Rupiah (bigint)**. Kebijakan pembulatan dikonfigurasi.
5. **Stok berbasis ledger**: `stock_movements` append-only; saldo diturunkan dan di-cache. Mutasi dalam transaksi DB dengan row lock.
6. **Dokumen keuangan immutable**: invoice final tidak diedit; koreksi lewat void/refund/retur dengan jejak audit.
7. **Rekam medis**: draft → final (terkunci) → koreksi lewat addendum berversi. Akses dan perubahan tercatat.
8. **Audit log** untuk aksi sensitif.
9. **Idempotensi** untuk webhook dan pembuatan pembayaran (idempotency key).
10. **Soft delete** untuk master data; hard delete hanya untuk data sementara.
11. **Zona waktu**: simpan UTC, tampilkan sesuai pengaturan (default `Asia/Jakarta`).
12. **Penomoran dokumen** dapat dikonfigurasi per jenis dan per cabang, misalnya `INV/{BRANCH}/{YYYY}{MM}/{SEQ:5}`, dengan counter atomik di DB.

## Multi-Cabang
- Satu `organization` (owner) dan banyak `branches`. Setiap cabang: nama, kode, alamat, kontak, jam operasional, zona waktu, header/footer struk, rekening penerimaan, gudang.
- Entitas ber-cabang: gudang, stok, shift kasir, transaksi, janji temu, kunjungan klinik, rawat inap, kandang/kamar, jadwal staf, kas.
- Entitas global: pelanggan, hewan, produk (master), layanan (master), template, role, integrasi. Harga dan ketersediaan dapat di-override per cabang.
- Transfer stok antar cabang: diminta → dikirim → diterima.
- Laporan konsolidasi (semua cabang) dan per cabang.
- Staf dapat ditugaskan ke satu atau banyak cabang, dengan role berbeda per cabang.
- Pengaturan terpusat dikelola Owner/Super Admin; cabang dapat meng-override hanya yang diizinkan.

## Diagram Komponen (Tekstual)
```
[Browser] <─ HTTPS ─ [Caddy] <─ [Next.js web]
                              ├─ Route Handlers (/api, webhook)
                              ├─ Server Actions (mutasi)
                              └─ packages/core (service layer)
                                    ├─ packages/auth (sesi, realm)
                                    ├─ packages/rbac (can())
                                    ├─ packages/integrations (adapter registry)
                                    ├─ packages/documents (PDF, penomoran)
                                    └─ packages/db (Drizzle → PostgreSQL)
[Worker] ← Redis/BullMQ ← [Next.js web]
[Worker] → PostgreSQL, WhatsApp API, Email API, storage
```