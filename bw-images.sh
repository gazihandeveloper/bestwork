#!/usr/bin/env bash
# BestWork görsel değişimi: sağlıklı yaşam / sağlıklı ve mutlu insanlar temalı görseller
set -euo pipefail

UPLOADS=/var/www/mahmutgazihanarslan/bestwork/backend/uploads
TMP=/tmp/bw-imgs
mkdir -p "$TMP" "$UPLOADS/.original-backup"

# orijinalleri yedekle (zaten yoksa)
if [ ! -f "$UPLOADS/.original-backup/landscape-1.jpg" ]; then
  cp "$UPLOADS"/landscape-*.jpg "$UPLOADS"/product-*.jpg "$UPLOADS"/coffee-*.jpg "$UPLOADS/.original-backup/"
  echo "✔ orijinaller yedeklendi: $UPLOADS/.original-backup/"
fi

dl() { # dl <url> <hedef>
  local url="$1" dest="$2"
  curl -fsSL --retry 2 --max-time 60 "$url" -o "$TMP/$(basename "$dest")" || { echo "✖ indirilemedi: $dest"; return 1; }
  local type; type=$(file -b "$TMP/$(basename "$dest")" | cut -d, -f1)
  echo "  $dest <- $type ($(du -h "$TMP/$(basename "$dest")" | cut -f1))"
}

echo "=== Hero slaytları (sağlıklı yaşam / mutlu insanlar) ==="
dl "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1600&q=80&auto=format&fit=crop" landscape-1.jpg
dl "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1600&q=80&auto=format&fit=crop" landscape-2.jpg
dl "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1600&q=80&auto=format&fit=crop" landscape-3.jpg
dl "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1600&q=80&auto=format&fit=crop" landscape-4.jpg
dl "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1600&q=80&auto=format&fit=crop" landscape-5.jpg

echo "=== Ürün görselleri (sağlıklı yaşam) ==="
dl "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80&auto=format&fit=crop" product-1.jpg
dl "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80&auto=format&fit=crop" product-2.jpg
dl "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80&auto=format&fit=crop" product-3.jpg
dl "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&q=80&auto=format&fit=crop" coffee-1.jpg
dl "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80&auto=format&fit=crop" coffee-2.jpg

echo "=== dosyaları yerine koy ==="
for f in landscape-1 landscape-2 landscape-3 landscape-4 landscape-5 product-1 product-2 product-3 coffee-1 coffee-2; do
  if [ -s "$TMP/$f.jpg" ]; then
    mv -f "$TMP/$f.jpg" "$UPLOADS/$f.jpg"
    chmod 644 "$UPLOADS/$f.jpg"
    echo "✔ $f.jpg güncellendi"
  else
    echo "✖ $f.jpg BOŞ, atlandı"
  fi
done
rm -rf "$TMP"
echo "=== tamam ==="
