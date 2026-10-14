-- ============================================
-- 0035: Ürün yorumları onay akışı
-- Yeni yorumlar admin onayı olmadan yayınlanmaz.
-- ============================================

ALTER TABLE product_reviews ALTER COLUMN is_approved SET DEFAULT FALSE;
