INSERT INTO wallets (user_id, balance, total_earned, total_withdrawn, chip_balance)
VALUES (90001, 0, 0, 0, 0)
ON CONFLICT (user_id) DO NOTHING;
SELECT w.user_id, w.balance, w.total_earned, w.chip_balance FROM wallets w WHERE w.user_id = 90001;
