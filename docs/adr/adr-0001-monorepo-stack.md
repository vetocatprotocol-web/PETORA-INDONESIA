# ADR-0001: Monorepo Stack

## Status
Disetujui (Fase 0)

## Konteks
Aplikasi perlu panel staf, portal pelanggan, dan worker latar belakang dengan berbagian logika dan tipe.

## Keputusan
Monorepo Next.js (App Router, TypeScript strict) dengan paket terpisah: db, core, auth, rbac, integrations, documents, ui, config. Apps: web dan worker.

## Konsekuensi
- Tipe dan logika bisnis dibagikan antar web, worker, dan route handler.
- Perlu tooling monorepo dan import boundary antar package.