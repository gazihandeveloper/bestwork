#!/usr/bin/env bash
# =============================================================
# BestWork — Otomatik Yedekleme (PostgreSQL + uploads)
# Mac mini M4 (launchd) için tasarlandı; Linux'ta cron ile de çağrılabilir.
#
# Ne yapar:
#   1) PostgreSQL'i pg_dump (custom format) olarak yedekler
#   2) uploads Docker volume'ünü (görseller) tar.gz yapar
#   3) Yerel rotasyon (varsayılan son 14 gün)
#   4) BACKUP_REMOTE tanımlıysa rsync ile dış konuma senkronlar
#
# Kullanım:  bash scripts/backup.sh
# =============================================================
set -uo pipefail

# Proje köküne göre çalış (script nerede olursa olsun)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

BACKUP_DIR="${BACKUP_DIR:-$HOME/bestwork-backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%F_%H%M)"
DB_USER="${POSTGRES_USER:-bestwork}"
DB_NAME="${POSTGRES_DB:-bestwork}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-bestwork_uploads}"
BACKUP_REMOTE="${BACKUP_REMOTE:-}"   # örn: user@host:/path veya /Volumes/Yedek/bestwork

mkdir -p "$BACKUP_DIR"
LOG="$BACKUP_DIR/backup.log"
log() { echo "[$(date '+%F %T')] $*" | tee -a "$LOG"; }

log "=== Yedekleme başladı ($STAMP) ==="

# 1) Veritabanı
DB_FILE="$BACKUP_DIR/db-$STAMP.dump"
if docker compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$DB_FILE" 2>>"$LOG"; then
  log "DB yedeği OK: $(basename "$DB_FILE") ($(du -h "$DB_FILE" | cut -f1))"
else
  log "HATA: DB yedeği alınamadı!"; rm -f "$DB_FILE"
fi

# 2) uploads volume
UP_FILE="$BACKUP_DIR/uploads-$STAMP.tar.gz"
if docker run --rm -v "${UPLOADS_VOLUME}:/data:ro" -v "$BACKUP_DIR:/backup" alpine \
     tar czf "/backup/$(basename "$UP_FILE")" -C /data . >>"$LOG" 2>&1; then
  log "uploads yedeği OK: $(basename "$UP_FILE") ($(du -h "$UP_FILE" | cut -f1))"
else
  log "UYARI: uploads yedeği alınamadı (volume adı farklı olabilir: $UPLOADS_VOLUME)"
fi

# 3) Yerel rotasyon
find "$BACKUP_DIR" -name 'db-*.dump' -mtime "+$KEEP_DAYS" -delete 2>/dev/null
find "$BACKUP_DIR" -name 'uploads-*.tar.gz' -mtime "+$KEEP_DAYS" -delete 2>/dev/null
log "Rotasyon: $KEEP_DAYS günden eski yedekler silindi."

# 4) Dış konum senkronizasyonu (opsiyonel)
if [ -n "$BACKUP_REMOTE" ]; then
  if rsync -a --delete "$BACKUP_DIR/" "$BACKUP_REMOTE/" >>"$LOG" 2>&1; then
    log "Dış senkron OK -> $BACKUP_REMOTE"
  else
    log "HATA: Dış senkron başarısız -> $BACKUP_REMOTE"
  fi
else
  log "UYARI: BACKUP_REMOTE tanımlı değil — yedek yalnızca yerelde. Dış konum ŞİDDETLE önerilir."
fi

log "=== Yedekleme bitti ==="
