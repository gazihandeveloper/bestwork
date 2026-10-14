-- ============================================
-- KAMPANYA VE PROMOSYONLAR
-- type: kampanya | promosyon · period_months: 3|6|9|12
-- personal_pv_quota: kişisel alışveriş PV kotası
-- short_leg_target: kısa kol (zayıf kol) hedefi — birikmiş değil, adminin belirlediği hedef
-- rank_rules: kariyer bazlı kurallar [{rank_id, short_leg_target, personal_pv_quota}]
-- ============================================
CREATE TABLE IF NOT EXISTS promotions (
  id                 BIGSERIAL PRIMARY KEY,
  type               VARCHAR(20)   NOT NULL DEFAULT 'promosyon',
  name               VARCHAR(200)  NOT NULL,
  description        TEXT          NOT NULL DEFAULT '',
  period_months      INTEGER       NOT NULL DEFAULT 3,
  personal_pv_quota  NUMERIC(14,2) NOT NULL DEFAULT 0,
  short_leg_target   NUMERIC(14,2) NOT NULL DEFAULT 0,
  rank_rules         JSONB         NOT NULL DEFAULT '[]',
  is_active          BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMP     NOT NULL DEFAULT now(),
  updated_at         TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions (is_active);
