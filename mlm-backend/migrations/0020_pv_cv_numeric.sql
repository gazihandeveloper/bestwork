-- 0020_pv_cv_numeric.sql
-- PV/CV artık ONDALIKLI (2 hane).
--
-- Neden: PV/CV şimdiye kadar bigint idi. Paket indirimi, binary eşleşme ve
-- oranlı hesaplarda küsurat kayboluyordu (ör. 4,25 PV → 4) ve kesirli değerler
-- 0'a düşebiliyordu. Artık numeric(14,2) = 12 tam + 2 ondalık hane.
--
-- Kapsam: PV/CV anlamı taşıyan 21 sütun (8 tablo).
-- bigint -> numeric dönüşümü kayıpsızdır; mevcut tam sayılar X.00 olur.

-- ── users ────────────────────────────────────────────────────────────────
ALTER TABLE users
  ALTER COLUMN total_pv_accumulated     TYPE numeric(14,2),
  ALTER COLUMN total_cv_accumulated     TYPE numeric(14,2),
  ALTER COLUMN total_pv_left            TYPE numeric(14,2),
  ALTER COLUMN total_pv_right           TYPE numeric(14,2),
  ALTER COLUMN total_cv_left            TYPE numeric(14,2),
  ALTER COLUMN total_cv_right           TYPE numeric(14,2),
  ALTER COLUMN current_month_personal_pv TYPE numeric(14,2);

-- ── products ─────────────────────────────────────────────────────────────
ALTER TABLE products
  ALTER COLUMN pv TYPE numeric(14,2),
  ALTER COLUMN cv TYPE numeric(14,2);

-- ── order_items ──────────────────────────────────────────────────────────
ALTER TABLE order_items
  ALTER COLUMN pv TYPE numeric(14,2),
  ALTER COLUMN cv TYPE numeric(14,2);

-- ── orders ───────────────────────────────────────────────────────────────
ALTER TABLE orders
  ALTER COLUMN total_pv TYPE numeric(14,2),
  ALTER COLUMN total_cv TYPE numeric(14,2);

-- ── binary_transactions ──────────────────────────────────────────────────
ALTER TABLE binary_transactions
  ALTER COLUMN pv TYPE numeric(14,2),
  ALTER COLUMN cv TYPE numeric(14,2);

-- ── commissions ──────────────────────────────────────────────────────────
ALTER TABLE commissions
  ALTER COLUMN related_cv TYPE numeric(14,2);

-- ── packages ─────────────────────────────────────────────────────────────
ALTER TABLE packages
  ALTER COLUMN cv          TYPE numeric(14,2),
  ALTER COLUMN required_pv TYPE numeric(14,2);

-- ── ranks ────────────────────────────────────────────────────────────────
ALTER TABLE ranks
  ALTER COLUMN personal_activity_pv TYPE numeric(14,2),
  ALTER COLUMN required_left_pv     TYPE numeric(14,2),
  ALTER COLUMN required_right_pv    TYPE numeric(14,2);
