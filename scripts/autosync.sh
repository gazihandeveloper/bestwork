#!/bin/bash
# Kod degisikliklerini + DB snapshotini BIRLIKTE isler:
#  - DB + uploads -> ~/bestwork-backups (surumlu, YEREL)
#  - kod -> git (~/bestwork-src aynasi) commit + push
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
LIVE="$HOME/bestwork-docker"
SRC="$HOME/bestwork-src"
TOKEN=$(cat "$HOME/.bestwork-token" 2>/dev/null)
REMOTE="https://github.com/gazihandeveloper/bestwork.git"

bash "$LIVE/scripts/db-snapshot.sh" >/dev/null 2>&1

# git aynasini guncelle
mkdir -p "$SRC"
if [ ! -d "$SRC/.git" ]; then
  git clone --depth 1 "$REMOTE" "$SRC" >/dev/null 2>&1
fi
cd "$LIVE"
rsync -a --delete \
  --exclude node_modules --exclude .next --exclude uploads --exclude '*.dump' \
  --exclude '*.tar.gz' --exclude .env --exclude '.env.*' --exclude '.DS_Store' \
  --exclude 'bestwork-backups' "$LIVE/" "$SRC/"

cd "$SRC" || exit 1
git add -A
if ! git diff --cached --quiet; then
  git -c user.email=server@bestwork.local -c user.name="BestWork Server" \
      commit -q -m "server otomatik commit $(date '+%F %T') (kod + DB snapshot)"
  if [ -n "$TOKEN" ]; then
    git -c credential.helper= pull --rebase --autostash "$REMOTE" main >/dev/null 2>&1
    git -c credential.helper= push "https://$TOKEN@github.com/gazihandeveloper/bestwork.git" HEAD:main >/dev/null 2>&1 \
      && echo "push OK" || echo "push BASARISIZ"
  else
    echo "token yok (sadece yerel commit)"
  fi
fi
