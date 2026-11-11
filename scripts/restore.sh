#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:-}"
if [ -z "$BACKUP_DIR" ]; then
  echo "Usage: ./scripts/restore.sh <backup-dir>"
  exit 1
fi

echo "Restore database..."
docker compose exec -T postgres psql -U petora -d petora < "$BACKUP_DIR/db.sql"

echo "Restore selesai dari $BACKUP_DIR"
echo "PERINGATAN: Pastikan kunci enkripsi dikembalikan ke volume secrets agar kredensial integrasi dapat dibaca."
