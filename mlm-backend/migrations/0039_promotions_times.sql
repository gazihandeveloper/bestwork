-- ============================================
-- KAMPANYA VE PROMOSYONLAR — Tarih + SAAT
-- starts_at / ends_at artık saat de tutar (timestamp).
-- Mevcut tarihler 00:00 olarak korunur.
-- ============================================
ALTER TABLE promotions
  ALTER COLUMN starts_at TYPE TIMESTAMP WITHOUT TIME ZONE USING starts_at::timestamp,
  ALTER COLUMN ends_at   TYPE TIMESTAMP WITHOUT TIME ZONE USING ends_at::timestamp;
