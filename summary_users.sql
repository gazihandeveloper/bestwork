SELECT 'TOPLAM KAYIT' AS kriter, COUNT(*) AS adet FROM users
UNION ALL SELECT 'Admin', COUNT(*) FROM users WHERE role = 'admin'
UNION ALL SELECT 'User', COUNT(*) FROM users WHERE role = 'user'
UNION ALL SELECT 'Customer', COUNT(*) FROM users WHERE role = 'customer'
UNION ALL SELECT 'Demo Üye (isim "Demo" ile başlıyor)', COUNT(*) FROM users WHERE name LIKE 'Demo %'
UNION ALL SELECT 'Gerçek üye (demo değil)', COUNT(*) FROM users WHERE name NOT LIKE 'Demo %'
UNION ALL SELECT 'Aktif', COUNT(*) FROM users WHERE is_active = true
UNION ALL SELECT 'Beklemede (pending pool)', COUNT(*) FROM users WHERE is_in_pending_pool = true;
SELECT '--- GERÇEK ÜYELER (demo harici) ---';
SELECT id, name, email, phone, member_code, role, is_active, created_at FROM users WHERE name NOT LIKE 'Demo %' ORDER BY id;
SELECT '--- ADMINLER ---';
SELECT id, name, email, member_code, created_at FROM users WHERE role = 'admin' ORDER BY id;
SELECT '--- EN ESKI 10 KAYIT ---';
SELECT id, name, email, member_code, role, created_at FROM users ORDER BY id LIMIT 10;
