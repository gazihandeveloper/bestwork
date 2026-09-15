-- 0022_user_pins.sql
-- Sabitlenen (pinlenen) üyeler.
--
-- Kullanıcı ağaçta sık baktığı üyeleri iğne ikonuyla sabitler; bu liste hesabına
-- bağlıdır ve her cihazdan görünür.
--
-- Not: owner_id + pinned_user_id birlikte birincil anahtardır; aynı üye iki kez
-- sabitlenemez. Her iki taraf da silinirse kayıt düşer (ON DELETE CASCADE).

CREATE TABLE IF NOT EXISTS user_pins (
  owner_id       BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pinned_user_id BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (owner_id, pinned_user_id)
);

-- Sahibine göre listeleme (sabitlenenler en yeni önce)
CREATE INDEX IF NOT EXISTS user_pins_owner_idx
  ON user_pins (owner_id, created_at DESC);
