-- 0033: Destek taleplerine 'unresolved' (çözümlenemedi) durumu ekle
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
    CHECK (status IN ('open', 'new', 'in_progress', 'resolved', 'closed', 'unresolved'));
