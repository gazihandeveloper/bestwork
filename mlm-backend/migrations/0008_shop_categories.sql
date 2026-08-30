-- 0008_shop_categories.sql
-- Mağaza kategorileri + ürün-kategori ilişkisi + Türkçe duyarsız arama (unaccent).

-- Arama düzeltmesi için unaccent eklentisi (products.q aramasında kullanılır).
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Kategoriler (ortak API sözleşmesi).
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) UNIQUE,
    icon VARCHAR(80) DEFAULT 'tag',
    description TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ürün-kategori ilişkisi: kategori silinirse ürünün category_id'si NULL olur
-- (eski string category alanı korunur).
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL;

-- Sözleşmedeki ayar anahtarları için varsayılan değerler (settings tablosu zaten
-- mevcut; eksik anahtarlar idempotent şekilde eklenir).
INSERT INTO settings (key, value) VALUES
('footer_about', 'BestWork, Binary MLM komisyon sistemi ile e-ticareti tek çatıda buluşturan modern bir platformdur.'),
('footer_copyright', '(c) 2026 BestWork. Tüm hakları saklıdır.'),
('social_instagram', ''),
('social_facebook', ''),
('social_youtube', '')
ON CONFLICT (key) DO NOTHING;
