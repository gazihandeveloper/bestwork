#!/usr/bin/env bash
# BestWork LIVE deploy — repodaki son commit'i canli servislere yayar
set -euo pipefail
SRC=/opt/bestwork-src
WWW=/var/www/mahmutgazihanarslan
LOG=/var/log/deploy-live.log
EXCL=(--exclude=node_modules --exclude=.next --exclude=.DS_Store --exclude='._*' --exclude='*.log' --exclude=tsconfig.tsbuildinfo --exclude=.env --exclude=.env.local --exclude='*.bak*')
log(){ echo "[$(date '+%F %T')] $*"; }
exec >> "$LOG" 2>&1

log "[1] git pull"
cd "$SRC"
git fetch --quiet origin main
git reset --hard --quiet origin/main
log "commit: $(git log --oneline -1)"

build_one() { # $1=isim $2=repo klasoru $3=hedef $4=servis
  local name="$1" src="$SRC/$2" dst="$3" svc="$4"
  log "[rsync] $name -> $3"
  rsync -a --delete "${EXCL[@]}" "$src/" "$dst/"
  cd "$dst"
  log "[npm install] $name"
  npm install --no-audit --no-fund --loglevel=error
  log "[build] $name"
  npm run build
  log "[restart] $svc"
  systemctl restart "$svc"
  log "OK $name"
}

build_one "eshop"    eshop           "$WWW/happyboon/frontend" happyboon-frontend
log "eshop basePath kokta, env yok"

export NEXT_PUBLIC_BASE_PATH=/bestmanager2
export NEXT_PUBLIC_API_URL=https://mahmutgazihanarslan.com.tr/api
build_one "yonetim2" mlm-yonetim-new "$WWW/bestwork/yonetim2" bestwork-yonetim2
unset NEXT_PUBLIC_BASE_PATH

export NEXT_PUBLIC_API_URL=https://mahmutgazihanarslan.com.tr/api
build_one "yonetim"  mlm-yonetim     "$WWW/bestwork/yonetim"  bestwork-yonetim
unset NEXT_PUBLIC_API_URL

log "DONE_ALL"
