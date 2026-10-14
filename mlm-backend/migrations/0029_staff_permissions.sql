-- 0029: Çalışan rolleri ve menü izinleri (RBAC)
-- Panel çalışanları users tablosunda role='staff' olarak tutulur; hangi
-- menüleri görebilecekleri staff_permissions tablosunda saklanır.
-- menu_key değerleri panel sayfa yollarıdır (örn. '/uyeler', '/siparisler').

CREATE TABLE IF NOT EXISTS staff_permissions (
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    menu_key   TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, menu_key)
);

CREATE INDEX IF NOT EXISTS idx_staff_permissions_user_id ON staff_permissions(user_id);
