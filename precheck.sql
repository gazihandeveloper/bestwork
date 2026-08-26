SELECT '--- mahmut/arslan/gazihan arama ---';
SELECT id, name, email, member_code, role FROM users WHERE lower(name) LIKE '%mahmut%' OR lower(name) LIKE '%arslan%' OR lower(name) LIKE '%gazihan%' OR lower(email) LIKE '%mahmut%';
SELECT '--- adminler ---';
SELECT id, name, email, member_code, created_at FROM users WHERE role = 'admin' ORDER BY id;
SELECT '--- id araligi ---';
SELECT MIN(id) AS min_id, MAX(id) AS max_id, COUNT(*) FROM users;
SELECT '--- en son uye kodu ---';
SELECT member_code FROM users ORDER BY id DESC LIMIT 1;
