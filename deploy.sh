#!/usr/bin/env bash
# Deploy frontend Finance: tarik kode terbaru, build, sajikan via PM2 (static SPA).
# Jalankan di server dari dalam folder repo: ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "==> git pull"
git pull --ff-only

echo "==> npm ci + build"
npm ci
npm run build   # .env.production → VITE_API_BASE kosong (pakai /api relatif)

echo "==> (re)serve PM2: finance-fe (port 8092)"
pm2 restart finance-fe 2>/dev/null || pm2 serve dist 8092 --spa --name finance-fe
pm2 save
echo "==> selesai. status:"
pm2 status finance-fe
