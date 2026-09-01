-- 0014_respawn.sql
-- "Yeniden Üyelik" (re-sponsorship): 1 yıl ürün almamış + kayıt yapmamış üye,
-- yeni sponsorla 0'dan üye olabilir; eski üyelik askıya alınır.

ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS respawned_from_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
