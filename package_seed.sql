BEGIN;

-- users.package_id -> packages(id) FK'sı silmeyi engellediği için
-- kullanıcıların paket referansları geçici olarak kaldırılır.
UPDATE users SET package_id = NULL, updated_at = NOW() WHERE package_id IS NOT NULL;

DELETE FROM packages;

INSERT INTO packages (id, name, price, referral_bonus_rate, binary_bonus_rate, matching_bonus_rate, discount_rate, required_pv) VALUES
(1, 'Starter', 250.00,  0.15, 0.04, 0.20, 0.00, 250),
(2, 'Bronze',  500.00,  0.15, 0.07, 0.20, 0.00, 500),
(3, 'Gümüş',   1300.00, 0.20, 0.09, 0.20, 0.00, 1300),
(4, 'Altın',   2500.00, 0.20, 0.11, 0.20, 0.00, 2500),
(5, 'Platin',  5000.00, 0.22, 0.13, 0.20, 0.25, 5000);

-- packages_id_seq dizisini güncelle (sonraki eklemeler çakışmasın)
SELECT setval(pg_get_serial_sequence('packages', 'id'), (SELECT MAX(id) FROM packages), true);

-- Kullanıcıların paket seviyelerini yeni eşiklere göre geri yükle
UPDATE users u SET package_id = (
    SELECT p.id FROM packages p
    WHERE p.required_pv > 0 AND u.total_pv_accumulated >= p.required_pv
    ORDER BY p.required_pv DESC
    LIMIT 1
)
WHERE u.total_pv_accumulated > 0;

COMMIT;
