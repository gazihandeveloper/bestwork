-- 0015_package_discounts.sql
-- Seviyeler (paketler) artık PV bazlı çalışır; TL fiyat kullanılmaz.
-- Fiyat CHECK'i kaldırılır ve ürün indirim oranları güncellenir.

ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_price_check;
ALTER TABLE packages ALTER COLUMN price SET DEFAULT 0;

-- Ürün indirim oranları: Starter %15, Bronze %15, Gümüş %20, Altın %20, Platin %25
UPDATE packages SET discount_rate = 0.15 WHERE name IN ('Starter', 'Bronze');
UPDATE packages SET discount_rate = 0.20 WHERE name IN ('Gümüş', 'Altın');
UPDATE packages SET discount_rate = 0.25 WHERE name = 'Platin';
