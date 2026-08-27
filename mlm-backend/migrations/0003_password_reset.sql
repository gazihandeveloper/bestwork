-- 0003: Şifre sıfırlama (Şifremi unuttum) altyapısı.
--
-- Kullanıcı "Şifremi unuttum" dediğinde tek kullanımlık bir sıfırlama kodu
-- üretilir, hash'li hali bu kolonlarda saklanır ve belirli süre sonra geçersiz
-- sayılır. Kod doğrulandığında şifre güncellenir ve token temizlenir.

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;
