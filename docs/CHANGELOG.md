# Changelog

Semua perubahan tercatat di file ini.

## [Unreleased]
- Lengkapi fondasi Fase 1: migrasi DB otomatis, healthcheck Docker, worker BullMQ, tema/i18n dasar, dan gerbang format serta integration test.
- Tambahkan auth backend Fase 2: login dua realm, sesi/cookie, Redis throttling, TOTP terenkripsi dengan proteksi replay, dan pembuatan secret persisten saat init.
- Fase 2 (lanjutan): seed katalog permission/role sistem idempotent (init/setup), helper core (audit, settings/feature-flags, penomoran dokumen, setup/wizard, loader aktor RBAC, platform CRUD dasar), kerangka integrasi (enkripsi kredensial, registry adapter, CRUD koneksi terenkripsi API+UI dasar), Setup Wizard dasar (`/setup`, status/init API, redirect root), audit event autentikasi login/logout, UI enrollment 2FA, dan admin API/UI dasar (cabang, role+permission, integrasi, settings/feature-flags, audit log).
- Fase 2 (iterasi): UI integrasi dinamis per adapter (config/kredensial terenkripsi, aktif/nonaktif/hapus), API update/hapus koneksi dan update role, serta UI buat/edit role kustom dengan matriks permission per modul.
- Fase 2 (iterasi): API penugasan user↔role↔cabang (`/api/admin/users`) + UI penugasan dasar, dan endpoint/UI uji koneksi integrasi berbasis validasi kelengkapan field wajib (`/api/admin/integrations/:id/test`).
- Fase 2 (iterasi): daftar/hapus penugasan role (`/api/admin/users/assignments` + UI), ingest webhook generik idempoten ke `webhook_events` (`/api/webhooks/:provider`, `packages/integrations` webhook helper), dan core helper `listUserRoleAssignments`/`removeUserRoleAssignment`.
- Fase 2 (iterasi): klon role (API + UI), helper routing integrasi per purpose/branch (`packages/integrations/routes`, API `/api/admin/integrations/routes`), dan fondasi assignment/role lanjutan di core.
- Fase 2 (iterasi): adapter kirim Resend/WhatsApp Cloud/Gateway (`packages/integrations/send`), endpoint/UI "Kirim uji" integrasi (`/api/admin/integrations/:id/send-test`), worker pemroses `outbound_messages` (queue/poll `outbound.send|poll`), dan UI manajemen routing integrasi per purpose/cabang.
- Fase 2 (iterasi): mesin notifikasi dasar (`packages/core/notifications`: render template, dispatch event→rule→template→outbound/inbox) dan CRUD API+UI template & aturan notifikasi (`/admin/notification-templates`, `/admin/notification-rules`).

## [1.0.0] - Belum dirilis
- Rilis awal PETORA INDONESIA.