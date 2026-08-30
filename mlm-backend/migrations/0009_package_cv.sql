-- 0009_package_cv.sql
-- Paketlere CV alanı eklenir. İş kuralı: 1 PV = 1 CV (varsayılan), PV genelde
-- sabittir; CV ayrıca ayarlanabilir (değişebilir).

ALTER TABLE packages ADD COLUMN IF NOT EXISTS cv BIGINT NOT NULL DEFAULT 0;

-- Mevcut paketlerde varsayılan olarak CV = PV (1:1) kuralı uygulanır.
UPDATE packages SET cv = required_pv WHERE cv = 0 AND required_pv > 0;
