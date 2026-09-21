-- Aylık "tekrar" seviyesi: flashout ve matching, o ay tekrarlanabilen en yüksek
-- kariyere göre uygulanır. Kalıcı ünvan (current_rank_id) değişmez.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS current_month_pv_left numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS current_month_pv_right numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS current_month_rank_id bigint REFERENCES ranks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS users_current_month_rank_idx ON users(current_month_rank_id);
