-- Vergi tanımları (KDV vb.). Fiyatlar KDV hariçtir; vergi siparişte eklenir.
-- Vergi, KATEGORİ bazında atanır (categories.tax_id); ürün kategorisinden alır.
CREATE TABLE IF NOT EXISTS taxes (
    id         BIGSERIAL PRIMARY KEY,
    title      VARCHAR(120) NOT NULL,
    rate       NUMERIC(6,2) NOT NULL DEFAULT 0,   -- yüzde (ör. 20.00)
    sort_order INT NOT NULL DEFAULT 0,
    status     VARCHAR(20) NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','draft','pending')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS tax_id bigint REFERENCES taxes(id) ON DELETE SET NULL;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS total_tax NUMERIC(15,2) NOT NULL DEFAULT 0;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS tax_id bigint REFERENCES taxes(id) ON DELETE SET NULL;
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(6,2) NOT NULL DEFAULT 0;
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0;
