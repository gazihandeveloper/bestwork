\d wallets
SELECT '--- mevcut cüzdanlar ---';
SELECT id, user_id, balance, total_earned FROM wallets ORDER BY user_id LIMIT 10;
SELECT '--- cüzdanı OLMAYAN kullanıcılar (ilk 20) ---';
SELECT u.id, u.name, u.role FROM users u LEFT JOIN wallets w ON w.user_id = u.id WHERE w.id IS NULL ORDER BY u.id LIMIT 20;
SELECT '--- cüzdanı olmayan toplam ---';
SELECT COUNT(*) FROM users u LEFT JOIN wallets w ON w.user_id = u.id WHERE w.id IS NULL;
