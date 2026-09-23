-- Kazanç Planı / Network Ayarları: kazanç kalemleri ve kariyer×derinlik oran matrisi.
CREATE TABLE IF NOT EXISTS earning_plans (
    id            BIGSERIAL PRIMARY KEY,
    code          VARCHAR(40)  NOT NULL UNIQUE,          -- referral, binary, matching, retail, career...
    title         VARCHAR(120) NOT NULL,                 -- bayiye görünen isim
    description   TEXT,                                  -- düzenlenebilir kısa açıklama
    payout_type   VARCHAR(10)  NOT NULL DEFAULT 'gelir'  -- gelir | puan | bonus
                  CHECK (payout_type IN ('gelir','puan','bonus')),
    max_rate      NUMERIC(6,2) NOT NULL DEFAULT 0,       -- maksimum dağıtım oranı (%)
    scope         VARCHAR(10)  NOT NULL DEFAULT 'tree'   -- product (ürün bazlı) | tree (ağaç bazlı)
                  CHECK (scope IN ('product','tree')),
    period        VARCHAR(10)  NOT NULL DEFAULT 'monthly' -- daily | weekly | monthly
                  CHECK (period IN ('daily','weekly','monthly')),
    activity_mode VARCHAR(20)  NOT NULL DEFAULT 'none'   -- none | personal | team
                  CHECK (activity_mode IN ('none','personal','team')),
    check_matching BOOLEAN     NOT NULL DEFAULT TRUE,    -- eşleşmeye dahil mi
    depth         INT          NOT NULL DEFAULT 0,       -- kaç derinlik/nesil (0 = derinlik yok)
    sort_order    INT          NOT NULL DEFAULT 0,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS earning_plan_rates (
    id       BIGSERIAL PRIMARY KEY,
    plan_id  BIGINT NOT NULL REFERENCES earning_plans(id) ON DELETE CASCADE,
    rank_id  BIGINT NOT NULL REFERENCES ranks(id) ON DELETE CASCADE,
    depth    INT    NOT NULL DEFAULT 1,                 -- 1..depth
    rate     NUMERIC(6,2) NOT NULL DEFAULT 0,           -- yüzde (%)
    UNIQUE (plan_id, rank_id, depth)
);

CREATE INDEX IF NOT EXISTS earning_plan_rates_plan_idx ON earning_plan_rates(plan_id);

-- Varsayılan kazanç kalemleri (mevcut motorla uyumlu başlangıç değerleri)
INSERT INTO earning_plans (code, title, description, payout_type, max_rate, scope, period, activity_mode, check_matching, depth, sort_order)
VALUES
  ('referral', 'Referans Primi', 'Sponsor olduğunuz üyelerin sipariş CV''sinden kazanç.', 'gelir', 100, 'product', 'monthly', 'none', TRUE, 1, 1),
  ('binary',   'Binary Eşleşme', 'Sol/sağ bacak CV eşleşmesinden kazanç.', 'gelir', 100, 'tree', 'monthly', 'personal', TRUE, 0, 2),
  ('matching', 'Liderlik (Matching)', 'Ekibin binary kazancından 5 nesle kadar pay.', 'gelir', 100, 'tree', 'monthly', 'personal', FALSE, 5, 3),
  ('retail',   'Müşteri (Retail) Geliri', 'Müşteri siparişlerinden perakende kazancı.', 'gelir', 100, 'product', 'monthly', 'none', FALSE, 1, 4),
  ('career',   'Kariyer Primi', 'Yeni kariyere ilk kez ulaşınca tek seferlik prim.', 'bonus', 100, 'tree', 'monthly', 'none', FALSE, 0, 5)
ON CONFLICT (code) DO NOTHING;
