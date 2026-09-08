#!/usr/bin/env bash
# BestWork LIVE deploy — repodaki son commit'i canli servislere yayar
# FAZ F: yeni topoloji — eshop (kok site) + yonetim2 (/bestmanager2). Eski yonetim ayagi KALDIRILDI.
set -euo pipefail
SRC=/opt/bestwork-src
WWW=/var/www/mahmutgazihanarslan
LOG=/var/log/deploy-live.log
EXCL=(--exclude=node_modules --exclude=.next --exclude=.DS_Store --exclude='._*' --exclude='*.log' --exclude=tsconfig.tsbuildinfo --exclude=.env --exclude=.env.local --exclude='*.bak*')
log(){ echo "[$(date '+%F %T')] $*"; }
exec >> "$LOG" 2>&1

log "[0] guvenlik: DB yedegi (pgdump)"
/usr/local/bin/bestwork-pgdump.sh >/dev/null 2>&1 || log "[0] UYARI: pg_dump basarisiz (deploy devam ediyor)"

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
  chown -R bestwork:bestwork "$dst" 2>/dev/null || true
  systemctl restart "$svc"
  log "OK $name"
}

build_one "eshop"    eshop           "$WWW/happyboon/frontend" happyboon-frontend
log "eshop basePath kokta, env yok"

export NEXT_PUBLIC_BASE_PATH=/bestmanager
export NEXT_PUBLIC_API_URL=https://mahmutgazihanarslan.com.tr/api
build_one "yonetim2" mlm-yonetim-new "$WWW/bestwork/yonetim2" bestwork-yonetim2
unset NEXT_PUBLIC_BASE_PATH

log "[verify]"
curl -s -o /dev/null -w 'root=%{http_code} ' http://127.0.0.1:3000/ || true
curl -s -o /dev/null -w 'bestmanager2=%{http_code} ' http://127.0.0.1:3007/ || true
curl -s -o /dev/null -w 'api_health=%{http_code}\n' http://127.0.0.1:8090/health || true

log "DONE_ALL"
