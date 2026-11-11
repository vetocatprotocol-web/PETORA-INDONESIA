# Kontribusi

1. Baca AGENT.md sebelum menulis kode.
2. Kerjakan fase berurutan; jangan lompat gerbang keluar.
3. Dokumentasi dulu, kode kemudian; ubah kode berarti ubah dokumen di commit yang sama.
4. Lacak progres di `docs/PROGRESS.md`.
5. Ambil keputusan kecil sendiri, catat sebagai ADR singkat di `docs/adr/`.
6. Dilarang stub palsu, TODO, data palsu, atau tombol mati pada akhir fase.
7. Tidak ada hardcode untuk kredensial, tarif pajak, nama bisnis, URL provider, atau daftar role.
8. Setiap akhir fase jalankan: lint, typecheck, unit test, integration test, build, dan smoke test Docker. Semua harus hijau.
9. Commit kecil dan bermakna (Conventional Commits).
10. Bahasa: kode, nama variabel, dan komentar teknis dalam bahasa Inggris. UI default bahasa Indonesia.

## Commit Message Format
`type(scope): descripsi singkat`

Contoh: `feat(pos): add discount validation`

Tipe: feat, fix, docs, refactor, test, build, ci, chore.