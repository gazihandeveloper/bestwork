-- 0018_piggy_bank.sql
-- Kumbara (aktiflik ödülü) sistemi:
--  - users.piggy_pv: kumbara birikmiş PV (sadece ürün alışverişinde kullanılabilir, çekilemez)
--  - users.piggy_expires_at: kumbara hesabının sıfırlanacağı tarih (son ekleme/kullanımdan 3 ay)
--  - users.current_month_platinum_count: bu ay kaydedilen Platin paket sayısı (aktiflik şartı)
--  - settings: piggy_platinum_goal (aktiflik için Platin sayısı, varsayılan 2),
--              piggy_group_pv (her tam 2'li gruba verilen PV, varsayılan 600)

ALTER TABLE users ADD COLUMN IF NOT EXISTS piggy_pv BIGINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS piggy_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_month_platinum_count INT NOT NULL DEFAULT 0;

INSERT INTO settings (key, value) VALUES ('piggy_platinum_goal', '2')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value) VALUES ('piggy_group_pv', '600')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value) VALUES ('piggy_expire_months', '3')
ON CONFLICT (key) DO NOTHING;

-- Kumbara işlem geçmişi (credit = ekleme, debit = alışverişte kullanım)
CREATE TABLE IF NOT EXISTS piggy_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('credit','debit')),
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_piggy_tx_user ON piggy_transactions(user_id, id);

-- Siparişlerde kullanılan kumbara PV'si
ALTER TABLE orders ADD COLUMN IF NOT EXISTS piggy_pv_used BIGINT NOT NULL DEFAULT 0;


