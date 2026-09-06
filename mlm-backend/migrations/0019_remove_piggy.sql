-- 0019_remove_piggy.sql
-- Kumbara sistemi kaldırıldı. Yerine AKTİFLİK ŞARTI (ödül yok):
--   Kişi, kendi kaydettiği (1. hat) alt üyelerden bu ay HEDEF PAKET seviyesine
--   ulaşanları saydırır. Hedef paket + hedef adet panelden değişir
--   (settings: activity_package_id, activity_goal_count). Hedefe ulaşan üye
--   o ay AKTİF sayılır (ürün alışverişi şartı yok; 1 ay geçerli, ay sonu sıfırlanır).
--   Varsayılan hedef: Bronze (2) + 2 kayıt.

-- Ay içindeki paket kayıt sayacı aktiflik için KALIR.
ALTER TABLE users RENAME COLUMN current_month_platinum_count TO current_month_platinum_count;
ALTER TABLE users ALTER COLUMN current_month_platinum_count SET DEFAULT 0;

-- Kumbara alanlarını ve tablosunu kaldır
ALTER TABLE users DROP COLUMN IF EXISTS piggy_pv;
ALTER TABLE users DROP COLUMN IF EXISTS piggy_expires_at;
ALTER TABLE orders DROP COLUMN IF EXISTS piggy_pv_used;
DROP TABLE IF EXISTS piggy_transactions;

-- Ayar anahtarları: kumbara anahtarlarını sil
DELETE FROM settings WHERE key IN ('piggy_group_pv', 'piggy_expire_months', 'piggy_platinum_goal');

-- Aktiflik hedefi: paket + adet (varsayılan Bronze=2, hedef 2)
INSERT INTO settings (key, value) VALUES ('activity_package_id', '2')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

INSERT INTO settings (key, value) VALUES ('activity_goal_count', '2')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
