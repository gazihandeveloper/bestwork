#!/bin/bash
# Sunucuda calistirin: public repodan cekip sadece degisen src'leri isler ve derler.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
TOKEN="8251679221:AAHhLSjLKP_GJqeREwND6D0FVmXb-OBQGsI"
CHAT="8731898353"
say(){ curl -s -m 25 "https://api.telegram.org/bot$TOKEN/sendMessage" -d chat_id="$CHAT" --data-urlencode "text=$1" >/dev/null 2>&1; }
cd "$HOME/bestwork-docker" || { say "❌ proje dizini yok"; exit 1; }
say "⬇️ Sunucu guncelleniyor (git pull + derleme) $(date '+%H:%M')"
REPO=/tmp/bestwork-repo
if [ -d "$REPO/.git" ]; then
  git -C "$REPO" fetch --depth 1 origin main && git -C "$REPO" reset --hard origin/main
else
  git clone --depth 1 https://github.com/gazihandeveloper/bestwork "$REPO"
fi
[ -d "$REPO/mlm-yonetim-new/src" ] || { say "❌ git cekilemedi"; exit 1; }
cp -R mlm-yonetim-new/src "/tmp/panel-src-backup-$(date +%s)" 2>/dev/null
cp -R eshop/src "/tmp/eshop-src-backup-$(date +%s)" 2>/dev/null
rsync -a --delete "$REPO/mlm-yonetim-new/src/" mlm-yonetim-new/src/
rsync -a --delete "$REPO/eshop/src/" eshop/src/
docker compose build yonetim2 eshop > /tmp/server-build.log 2>&1; BE=$?
if [ "$BE" != 0 ]; then say "❌ DERLEME HATASI:
$(tail -c 1500 /tmp/server-build.log)"; exit 1; fi
docker compose up -d yonetim2 eshop >> /tmp/server-build.log 2>&1
sleep 8
PN=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/bestmanager/signin)
API=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/health)
say "✅ TAMAM ($(date '+%H:%M')). Panel HTTP $PN · API HTTP $API · Yayinda."
