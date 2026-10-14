-- 0032: TC Kimlik alanı geri alındı (0031'in tersi)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tc_kimlik_check;
ALTER TABLE users DROP COLUMN IF EXISTS tc_kimlik;
