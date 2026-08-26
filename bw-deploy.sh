#!/usr/bin/env bash
# BestWork sunucu deploy betiği
# GitHub'a push yapıldıktan sonra sunucuda çalıştırın:
#   /opt/bestwork-src/deploy.sh
# Akış: pull → backend derle → yükle → frontend senkron+build → servisleri yeniden başlat
set -euo pipefail

SRC=/opt/bestwork-src
DIR=/var/www/mahmutgazihanarslan/bestwork
API_URL=https://mahmutgazihanarslan.com.tr/api
LOG=/var/log/bestwork-deploy.log

log() { echo "▸ $(date '+%F %T') $*"; }

{
cd "$SRC"

log "[1/5] Git güncelleniyor (origin/main)"
git fetch --quiet origin main
git reset --hard --quiet origin/main

log "[2/5] Backend derleniyor (linux/amd64)"
mkdir -p /tmp/bw-deploy
cd "$SRC/mlm-backend"
for b in api cron migrate createadmin; do
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o "/tmp/bw-deploy/bestwork-$b" "./cmd/$b"
done

log "[3/5] Backend yükleniyor (api+cron durdurulur, uploads/logs korunur)"
systemctl stop bestwork-api bestwork-cron || true
cp /tmp/bw-deploy/bestwork-api /tmp/bw-deploy/bestwork-cron /tmp/bw-deploy/bestwork-migrate /tmp/bw-deploy/bestwork-createadmin "$DIR/backend/"
mkdir -p "$DIR/backend/migrations"
cp -r "$SRC/mlm-backend/migrations/." "$DIR/backend/migrations/"
chmod +x "$DIR"/backend/bestwork-*

log "[4/5] Frontend senkron + build (birkaç dakika sürebilir)"
rsync -a --delete \
  --exclude=node_modules --exclude=.next --exclude=.DS_Store --exclude='._*' \
  --exclude=server.log --exclude=.env.local \
  "$SRC/mlm-frontend/" "$DIR/frontend/"
cd "$DIR/frontend"
export NEXT_PUBLIC_API_URL="$API_URL"
export NEXT_PUBLIC_BASE_PATH=/bestwork
npm install --no-audit --no-fund --loglevel=error
npm run build

log "[5/5] Servisler yeniden başlatılıyor"
systemctl restart bestwork-api bestwork-cron bestwork-frontend

rm -rf /tmp/bw-deploy
log "✔ Deploy tamam: https://mahmutgazihanarslan.com.tr/bestwork"
} 2>&1 | tee -a "$LOG"
