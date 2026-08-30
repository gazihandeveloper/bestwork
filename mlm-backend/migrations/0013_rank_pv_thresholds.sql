-- 0013_rank_pv_thresholds.sql
-- Kariyer merdivenindeki sol/sağ PV eşiklerini tam değerlerine getirir.
-- (Kariyer şartı = PV eşiği [spillover dahil] + alt kariyer şartı [kendi neslinden] + 250 PV aktiflik.)

UPDATE ranks SET required_left_pv = 5000, required_right_pv = 5000 WHERE name = 'Jade';
UPDATE ranks SET required_left_pv = 15000, required_right_pv = 15000 WHERE name = 'Pearl';
UPDATE ranks SET required_left_pv = 50000, required_right_pv = 50000 WHERE name = 'Safir';
UPDATE ranks SET required_left_pv = 100000, required_right_pv = 100000 WHERE name = 'Ruby';
UPDATE ranks SET required_left_pv = 250000, required_right_pv = 250000 WHERE name = 'Zümrüt';
UPDATE ranks SET required_left_pv = 500000, required_right_pv = 500000 WHERE name = 'Diamond';
UPDATE ranks SET required_left_pv = 1000000, required_right_pv = 1000000 WHERE name = 'Blue Diamond';
UPDATE ranks SET required_left_pv = 2500000, required_right_pv = 2500000 WHERE name = 'Green Diamond';
UPDATE ranks SET required_left_pv = 5000000, required_right_pv = 5000000 WHERE name = 'Red Diamond';
UPDATE ranks SET required_left_pv = 7500000, required_right_pv = 7500000 WHERE name = 'Black Diamond';
UPDATE ranks SET required_left_pv = 10000000, required_right_pv = 10000000 WHERE name = 'President';
UPDATE ranks SET required_left_pv = 12500000, required_right_pv = 12500000 WHERE name = 'Ambassador';
