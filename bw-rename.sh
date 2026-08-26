#!/usr/bin/env bash
# Görselleri yeni adlarla kopyala (Cloudflare cache bypass) + DB güncelle
set -euo pipefail
UPLOADS=/var/www/mahmutgazihanarslan/bestwork/backend/uploads

echo "=== yeni adlarla kopyalama ==="
cp "$UPLOADS/landscape-1.jpg" "$UPLOADS/healthy-1.jpg"
cp "$UPLOADS/landscape-2.jpg" "$UPLOADS/healthy-2.jpg"
cp "$UPLOADS/landscape-3.jpg" "$UPLOADS/healthy-3.jpg"
cp "$UPLOADS/landscape-4.jpg" "$UPLOADS/healthy-4.jpg"
cp "$UPLOADS/landscape-5.jpg" "$UPLOADS/healthy-5.jpg"
cp "$UPLOADS/product-1.jpg"  "$UPLOADS/healthy-tea.jpg"
cp "$UPLOADS/product-2.jpg"  "$UPLOADS/healthy-coffee.jpg"
cp "$UPLOADS/product-3.jpg"  "$UPLOADS/healthy-kitchen.jpg"
cp "$UPLOADS/coffee-1.jpg"    "$UPLOADS/healthy-beans.jpg"
chmod 644 "$UPLOADS"/healthy-*.jpg
ls -la "$UPLOADS"/healthy-*.jpg

echo "=== DB yolları güncelleniyor ==="
PGPASSWORD=12122214799a92088dc8b33d83462d19 psql -h 127.0.0.1 -U bestwork -d bestwork <<'SQL'
UPDATE hero_slides SET image_path = '/uploads/healthy-1.jpg' WHERE id = 7;
UPDATE hero_slides SET image_path = '/uploads/healthy-2.jpg' WHERE id = 8;
UPDATE hero_slides SET image_path = '/uploads/healthy-3.jpg' WHERE id = 9;
UPDATE hero_slides SET image_path = '/uploads/healthy-4.jpg' WHERE id = 10;
UPDATE hero_slides SET image_path = '/uploads/healthy-5.jpg' WHERE id = 11;
UPDATE products SET image_path = '/uploads/healthy-tea.jpg'    WHERE id = 1;
UPDATE products SET image_path = '/uploads/healthy-coffee.jpg' WHERE id = 2;
UPDATE products SET image_path = '/uploads/healthy-kitchen.jpg' WHERE id = 3;
UPDATE products SET image_path = '/uploads/healthy-beans.jpg'  WHERE id = 39;
SELECT id, title, image_path FROM hero_slides ORDER BY id;
SELECT id, name, image_path FROM products WHERE id IN (1,2,3,39) ORDER BY id;
SQL
echo "=== eski dosyalar kaldırılıyor ==="
rm -f "$UPLOADS"/landscape-*.jpg "$UPLOADS"/product-*.jpg "$UPLOADS"/coffee-*.jpg
echo "tamam"
