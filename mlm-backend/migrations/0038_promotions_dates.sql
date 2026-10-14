-- ============================================
-- KAMPANYA VE PROMOSYONLAR — Başlangıç / Bitiş Tarihi
-- Süre (ay) yerine tarih aralığı: starts_at / ends_at
-- Mevcut kayıtlar için oluşturma tarihinden itibaren period_months aylık aralık doldurulur.
-- ============================================
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS starts_at DATE;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS ends_at DATE;

UPDATE promotions
SET starts_at = created_at::date,
    ends_at   = (created_at + (period_months || ' months')::interval)::date
WHERE starts_at IS NULL OR ends_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions (starts_at, ends_at);
