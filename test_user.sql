INSERT INTO users (id, name, email, member_code, role, password_hash, is_active, is_in_pending_pool)
VALUES (90002, 'Wallet Test', 'wallet-test@bestwork.com', 'TR90848720', 'user',
        '$2a$10$tNwK.zw0WObZZ51gktdbS.Fd24EXBoEAOe.ylq.c76Zw8MUdWFUBK', true, false)
ON CONFLICT (id) DO NOTHING;
SELECT setval('users_id_seq', GREATEST((SELECT MAX(id) FROM users), 90002));
SELECT 'cüzdanı var mı (olmamalı): ' || COUNT(*) FROM wallets WHERE user_id = 90002;
