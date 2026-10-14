-- 0030: users.role kısıtına 'staff' (panel çalışanı) rolünü ekle
-- Mevcut kısıt: admin, user, customer, super_admin → staff ekleniyor.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('super_admin', 'admin', 'staff', 'user', 'customer'));
