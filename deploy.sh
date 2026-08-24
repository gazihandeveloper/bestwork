#!/usr/bin/env bash
# BestWork deploy betiği — "güncelle → commit → sunucuyu güncelle" akışının 3. adımını
# (ve opsiyonel olarak 2. adımını) otomatikleştirir.
#
# Kullanım:
#   ./deploy.sh                     # sadece sunucuya yayınla
#   ./deploy.sh "mesaj"             # önce commit+push, sonra yayınla
#
# SSH parolası (anahtar kurulu değilse): DEPLOY_SSH_PASS env ile verilir.
#   DEPLOY_SSH_PASS='...' ./deploy.sh "mesaj"

set -euo pipefail

SERVER="root@212.154.77.35"
DIR="/var/www/mahmutgazihanarslan/bestwork"
ROOT="$(cd "$(dirname "$0")" && pwd)"
COMMIT_MSG="${1:-}"
SSH_PASS="${DEPLOY_SSH_PASS:-}"

# --- SSH yardımcıları (parola env'den, pty gerektirmez) ---
ASKPASS=""
if [ -n "$SSH_PASS" ]; then
  ASKPASS="$(mktemp)"
  printf '#!/bin/sh\necho "%s"\n' "$SSH_PASS" > "$ASKPASS"
  chmod +x "$ASKPASS"
  export SSH_ASKPASS="$ASKPASS" SSH_ASKPASS_REQUIRE=force DISPLAY=:0
fi
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=20)
trap '[ -n "$ASKPASS" ] && rm -f "$ASKPASS"' EXIT

# --- Adım 2: Git commit + push (opsiyonel) ---
if [ -n "$COMMIT_MSG" ]; then
  echo "▸ Git commit + push"
  git -C "$ROOT" add -A
  git -C "$ROOT" commit -m "$COMMIT_MSG"
  git -C "$ROOT" push origin main
fi

# --- Adım 3a: Backend derle + yükle ---
echo "▸ Backend derleniyor (linux/amd64)"
cd "$ROOT/mlm-backend"
mkdir -p /tmp/bw-deploy
for b in api cron migrate createadmin; do
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o "/tmp/bw-deploy/bestwork-$b" "./cmd/$b"
done
for b in api cron migrate createadmin; do
  scp "${SSH_OPTS[@]}" "/tmp/bw-deploy/bestwork-$b" "$SERVER:$DIR/backend/"
done
scp -r "${SSH_OPTS[@]}" "$ROOT/mlm-backend/migrations/." "$SERVER:$DIR/backend/migrations/"

# --- Adım 3b: Frontend paketle + yükle + build ---
echo "▸ Frontend yükleniyor + build (birkaç dakika sürebilir)"
cd "$ROOT"
tar -czf /tmp/bw-front.tar.gz --exclude=node_modules --exclude=.next --exclude=.env.local -C mlm-frontend .
scp "${SSH_OPTS[@]}" /tmp/bw-front.tar.gz "$SERVER:/tmp/"
ssh "${SSH_OPTS[@]}" "$SERVER" "
  set -e
  cd $DIR/frontend
  tar -xzf /tmp/bw-front.tar.gz && rm -f /tmp/bw-front.tar.gz
  export NEXT_PUBLIC_API_URL=https://mahmutgazihanarslan.com.tr/api
  export NEXT_PUBLIC_BASE_PATH=/bestwork
  npm install
  npm run build
  systemctl restart bestwork-frontend
"

# --- Adım 3c: Backend servislerini yeniden başlat ---
echo "▸ Backend servisleri yeniden başlatılıyor"
ssh "${SSH_OPTS[@]}" "$SERVER" "systemctl restart bestwork-api bestwork-cron"

# --- Not: şema değiştiyse migration çalıştır (manuel) ---
echo "✔ Yayın tamamlandı: https://mahmutgazihanarslan.com.tr/bestwork"
echo "  (şema/migration değiştiyse sunucuda bestwork-migrate çalıştır)"
