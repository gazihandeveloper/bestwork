#!/bin/bash
# git'te yeni commit varsa sunucuyu otomatik guncelleyip derler (SSH gerekmez)
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
TOKEN="8251679221:AAHhLSjLKP_GJqeREwND6D0FVmXb-OBQGsI"
CHAT="8731898353"
say(){ curl -s -m 25 "https://api.telegram.org/bot$TOKEN/sendMessage" -d chat_id="$CHAT" --data-urlencode "text=$1" >/dev/null 2>&1; }
REMOTE="https://github.com/gazihandeveloper/bestwork.git"
SRC="$HOME/bestwork-src"
cd "$HOME/bestwork-docker" || exit 1
[ -d "$SRC/.git" ] || git clone --depth 1 "$REMOTE" "$SRC" >/dev/null 2>&1
cd "$SRC"
git fetch --depth 1 origin main >/dev/null 2>&1
LOCAL=$(git rev-parse HEAD 2>/dev/null); NEW=$(git rev-parse origin/main 2>/dev/null)
[ -z "$NEW" ] && exit 0
[ "$LOCAL" = "$NEW" ] && exit 0
git reset --hard origin/main >/dev/null 2>&1
cd "$HOME/bestwork-docker"
cp -R mlm-yonetim-new/src "/tmp/panel-src-backup-$(date +%s)" 2>/dev/null
rsync -a --delete "$SRC/mlm-yonetim-new/src/" mlm-yonetim-new/src/
rsync -a --delete "$SRC/eshop/src/" eshop/src/
say "⬇️ Yeni sürüm bulundu, dağıtılıyor ($(cd "$SRC" && git log -1 --format=%h))"
docker compose build yonetim2 eshop > /tmp/autodeploy.log 2>&1
if [ $? -eq 0 ]; then
  docker compose up -d yonetim2 eshop >> /tmp/autodeploy.log 2>&1
  say "✅ Otomatik dağıtım TAMAM ($(date '+%H:%M'))."
else
  say "❌ Otomatik dağıtım hatası:
$(tail -c 1200 /tmp/autodeploy.log)"
fi
