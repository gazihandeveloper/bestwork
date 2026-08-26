#!/usr/bin/env bash
# BestWork otomatik yedek: canlı frontend kaynağını GitHub'a commit+push eder.
# Cron: */2 * * * * /usr/local/bin/bestwork-backup.sh
set -euo pipefail

SRC=/opt/bestwork-src
DIR=/var/www/mahmutgazihanarslan/bestwork
LOG=/var/log/bestwork-backup.log

cd "$SRC"

# 1) Canlı frontend kaynağını repoya senkronla (üretilen/platform dosyaları hariç).
#    -u ve --delete YOK: yalnızca canlıda DAHA YENİ olan dosyalar repo'ya geçer;
#    GitHub'da daha yeni olan (henüz canlıya deploy edilmemiş) dosyalar ASLA ezilmez.
rsync -a -u \
  --exclude=node_modules --exclude=.next --exclude=.DS_Store --exclude='._*' \
  --exclude=server.log --exclude=.env.local --exclude=.env \
  --exclude=package-lock.json --exclude=next-env.d.ts --exclude=tsconfig.tsbuildinfo \
  "$DIR/frontend/" "$SRC/mlm-frontend/"

# 2) Değişiklik var mı (izlenen + yeni dosyalar)?
if [ -z "$(git status --porcelain)" ]; then
  exit 0   # değişiklik yok → sessizce çık
fi

{
echo "$(date '+%F %T') ▸ Değişiklik bulundu, commit+push deneniyor"
git status --porcelain | head -20
git add -A
git commit -m "yedek: $(date '+%F %T') canlı sunucu güncellemesi" --quiet

# 3) Push (kimlik yoksa başarısız olur → commit geri alınır, veri kaybı olmaz)
if git push origin main; then
  echo "$(date '+%F %T') ✔ Yedek push edildi: $(git rev-parse --short HEAD)"
else
  echo "$(date '+%F %T') ✖ Push başarısız (kimlik eksik?) — commit geri alındı"
  git reset --hard --quiet origin/main
  git clean -fd --quiet
  exit 1
fi
} 2>&1 | tee -a "$LOG"
