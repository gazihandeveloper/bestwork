#!/usr/bin/env bash
# HIZLI deploy: commit → sunucudaki kaynağı eşitle → YALNIZ eshop derle + yeniden başlat.
# (Yönetim panelini yeniden derlemez, npm install çalıştırmaz → dakikalar yerine ~30-60 sn.)
#
# Kullanım: deploy-now.sh "kisa commit mesaji"
set -uo pipefail

ROOT=/Users/mahmutgazihanarslan/Desktop/Bestwork
SERVER=root@212.154.77.35
SRC=/opt/bestwork-src/eshop
DST=/var/www/mahmutgazihanarslan/happyboon/frontend
MSG="${1:-otomatik: whatsapp gorevi}"
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30 -o PreferredAuthentications=password -o PubkeyAuthentication=no)

cd "$ROOT"

git add -A
git commit -m "$MSG" >/dev/null 2>&1 || true

# GitHub main'i sunucudaki kimlikle güncelle (hızlı)
git bundle create /tmp/bw-auto.bundle origin/main..main >/dev/null 2>&1 || true
export SSH_ASKPASS="$ROOT/.ssh/askpass.sh" SSH_ASKPASS_REQUIRE=force DISPLAY=:0

scp "${SSH_OPTS[@]}" /tmp/bw-auto.bundle "$SERVER:/tmp/bw-auto.bundle" >/dev/null 2>&1
ssh "${SSH_OPTS[@]}" "$SERVER" '
  cd /opt/bestwork-src || exit 1
  git fetch /tmp/bw-auto.bundle refs/heads/main:refs/heads/tmp-deploy >/dev/null 2>&1
  git push origin tmp-deploy:main >/dev/null 2>&1
  git branch -D tmp-deploy >/dev/null 2>&1
  rm -f /tmp/bw-auto.bundle
  git fetch origin main >/dev/null 2>&1
  git reset --hard origin/main >/dev/null 2>&1
  echo "SRC_SYNCED=$(git log --oneline -1)"
' 2>&1 | tail -2

# Yalnız eshop: kaynağı eşitle + derle + yeniden başlat (npm install YOK)
ssh "${SSH_OPTS[@]}" "$SERVER" "
  rsync -a --delete \
    --exclude node_modules --exclude .next --exclude .env --exclude .env.local \
    --exclude '*.log' --exclude tsconfig.tsbuildinfo --exclude .DS_Store \
    $SRC/ $DST/
  cd $DST
  chown -R bestwork:bestwork . 2>/dev/null || true
  npm run build >/tmp/auto-build.log 2>&1 && systemctl restart happyboon-frontend && echo BUILD=OK || { echo BUILD=FAIL; tail -20 /tmp/auto-build.log; }
" 2>&1 | tail -4

rm -f /tmp/bw-auto.bundle
echo "DONE"
