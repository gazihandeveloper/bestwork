#!/bin/bash
# Veritabanı + uploads yerel yedeği (sunucuda calisir, public repo'ya GIRMEZ)
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
cd "$HOME/bestwork-docker" || exit 1
D="$HOME/bestwork-backups"; mkdir -p "$D"
S=$(date +%F_%H%M)
docker compose exec -T db pg_dump -U bestwork -d bestwork -Fc > "$D/db-$S.dump" 2>/dev/null && echo "db-$S.dump OK"
docker run --rm -v bestwork_uploads:/data:ro -v "$D:/b" alpine tar czf "/b/uploads-$S.tar.gz" -C /data . 2>/dev/null && echo "uploads-$S.tar.gz OK"
find "$D" -name 'db-*.dump' -mtime +14 -delete 2>/dev/null
find "$D" -name 'uploads-*.tar.gz' -mtime +14 -delete 2>/dev/null
