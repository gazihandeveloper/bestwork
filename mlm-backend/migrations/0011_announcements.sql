-- 0011_announcements.sql
-- Duyuru/bildirim modülü (CMS): üyelere panel içi duyurular.
CREATE TABLE IF NOT EXISTS announcements (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    audience VARCHAR(20) DEFAULT 'all' CHECK (audience IN ('all', 'member', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
