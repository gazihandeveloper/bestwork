-- 0002: Eski kurulumlarda users tablosuna phone + profile kolonlarını ekler.
--
-- 0001 (schema.sql) bu kolonları zaten içerir; IF NOT EXISTS sayesinde bu
-- migration taze kurulumlarda no-op'tur ve 0001'den önce kurulmuş (eski şema
-- dosyasıyla başlatılmış) veritabanlarını kodla uyumlu hale getirir.

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile JSONB DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_idx
ON users (phone)
WHERE phone IS NOT NULL;
