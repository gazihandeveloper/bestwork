-- 0017_manual_fx_shipping.sql
-- 1) Manuel döviz kuru: şirket USD/TRY kurunu kendisi belirler (TCMB yok).
-- 2) Kargo: sabit kargo ücreti + ücretsiz kargo eşiği (₺).
-- 3) orders tablosuna shipping_fee kolonu.

INSERT INTO settings (key, value) VALUES ('usd_try_rate', '40.00')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

INSERT INTO settings (key, value) VALUES ('shipping_fee', '0')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value) VALUES ('free_shipping_threshold', '0')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(15,2) NOT NULL DEFAULT 0;
