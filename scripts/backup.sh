#!/usr/bin/env bash
set -euo pipefail

TS=$(date +%Y%m%d%H%M%S)
BACKUP_DIR="./backups/petora-${TS}"
mkdir -p "$BACKUP_DIR"

echo "Backup database..."
docker compose exec -T postgres pg_dump -U petora petora > "$BACKUP_DIR/db.sql"

echo "Backup file unggahan..."
docker compose cp web:/app/uploads "$BACKUP_DIR/uploads" 2>/dev/null || true

echo "Backup kunci enkripsi (volume secrets)..."
docker compose cp web:/app/secrets "$BACKUP_DIR/secrets" 2>/dev/null || true

echo "Backup selesai: $BACKUP_DIR"
echo "PERINGATAN: Simpan kunci enkripsi aman. Tanpa kunci, kredensial integrasi tidak bisa dibaca."
