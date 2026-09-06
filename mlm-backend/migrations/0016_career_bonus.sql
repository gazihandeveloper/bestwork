-- 0016_career_bonus.sql
-- Her kariyer (rank) için ömür boyu bir kez ödenen "Kariyer Bonusu" tutarı.
-- Varsayılan: 250.00 ₺ (tüm mevcut kariyerler).

ALTER TABLE ranks ADD COLUMN IF NOT EXISTS career_bonus_amount NUMERIC(15,2) NOT NULL DEFAULT 250.00;

-- Kariyer bonusu ödemeleri commission kaydı olarak tutulur.
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_type_check;
ALTER TABLE commissions ADD CONSTRAINT commissions_type_check
    CHECK (type IN ('referral','binary','matching','retail','career'));
