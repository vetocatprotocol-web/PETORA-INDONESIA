#!/usr/bin/env bash
set -euo pipefail

echo "== PETORA INDONESIA installer =="

if [ ! -f .env ]; then
  echo "Membuat .env dari .env.example..."
  cp .env.example .env
fi

echo "Menjalankan docker compose up -d..."
docker compose up -d

echo "Selesai. Buka http://localhost atau https://${PETORA_DOMAIN:-localhost}"
echo "Selesaikan Setup Wizard pada pembukaan pertama."
