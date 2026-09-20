-- Destek taleplerini müşteri hizmetlerinin "üstlenmesi" için atanan kişi alanı
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS assigned_to bigint REFERENCES users(id) ON DELETE SET NULL;

-- Durum kısıtını genişlet (üstlenildi/resolved dahil)
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets
  ADD CONSTRAINT tickets_status_check
  CHECK (status::text = ANY (ARRAY['open','new','in_progress','resolved','closed']));

CREATE INDEX IF NOT EXISTS tickets_assigned_to_idx ON tickets(assigned_to);
