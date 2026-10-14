-- ============================================
-- 0036: Panel kullanıcı tercihleri (hesaba bağlı ayarlar)
-- Örn. dashboard widget düzeni: dashboard_widgets = ["kpi","ciro",...]
-- ============================================

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pref_key   VARCHAR(100) NOT NULL,
    pref_value TEXT NOT NULL DEFAULT 'null',
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, pref_key)
);
