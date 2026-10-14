-- ============================================
-- 0034: Ürün yorumları & değerlendirmeler
-- Eshop ürün detay sayfasındaki yorum bölümünün veri deposu.
-- ============================================

CREATE TABLE IF NOT EXISTS product_reviews (
    id          BIGSERIAL PRIMARY KEY,
    product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    author      VARCHAR(120) NOT NULL,
    rating      SMALLINT NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product
    ON product_reviews (product_id, created_at DESC);
