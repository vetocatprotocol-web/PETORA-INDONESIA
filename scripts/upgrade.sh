#!/usr/bin/env bash
set -euo pipefail

echo "== PETORA INDONESIA upgrade =="

IMAGE_TAG="${1:-}"
if [ -z "$IMAGE_TAG" ]; then
  echo "Usage: ./scripts/upgrade.sh <image-tag>"
  exit 1
fi

echo "Backup sebelum upgrade..."
./scripts/backup.sh

echo "Mengambil image ${IMAGE_TAG}..."
docker compose pull

echo "Migrasi..."
docker compose run --rm init

echo "Restart layanan..."
docker compose up -d

echo "Selesai upgrade ke ${IMAGE_TAG}."
