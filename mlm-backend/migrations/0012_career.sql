-- 0012_career.sql
-- Kariyer/liderlik motoru:
--   * ranks tablosuna downline şartı ve kişisel aktiflik alanları eklenir.
--   * users tablosuna aylık kişisel PV sayacı eklenir.
--   * 12 basamaklı kariyer merdiveni (isim bazlı, id kaymasına dayanıklı) yazılır.

ALTER TABLE ranks ADD COLUMN IF NOT EXISTS required_downline_rank_id INT REFERENCES ranks(id) ON DELETE SET NULL;
ALTER TABLE ranks ADD COLUMN IF NOT EXISTS required_downline_count INT NOT NULL DEFAULT 0;
ALTER TABLE ranks ADD COLUMN IF NOT EXISTS personal_activity_pv BIGINT NOT NULL DEFAULT 250;

ALTER TABLE users ADD COLUMN IF NOT EXISTS current_month_personal_pv BIGINT NOT NULL DEFAULT 0;

-- ── Kariyer merdiveni ─────────────────────────────────────────────────────
-- Jade / Pearl: PV bazlı (spillover dahil). Safir+ : downline (kendi neslinden).

UPDATE ranks SET required_left_pv = 5000, required_right_pv = 5000,
    required_downline_rank_id = NULL, required_downline_count = 0,
    personal_activity_pv = 250
WHERE name = 'Jade';

UPDATE ranks SET required_left_pv = 15000, required_right_pv = 15000,
    required_downline_rank_id = NULL, required_downline_count = 0,
    personal_activity_pv = 250
WHERE name = 'Pearl';

UPDATE ranks SET required_left_pv = 0, required_right_pv = 0,
    required_downline_rank_id = (SELECT id FROM ranks WHERE name = 'Jade'),
    required_downline_count = 1, personal_activity_pv = 250
WHERE name = 'Safir';

UPDATE ranks SET required_left_pv = 0, required_right_pv = 0,
    required_downline_rank_id = (SELECT id FROM ranks WHERE name = 'Pearl'),
    required_downline_count = 1, personal_activity_pv = 250
WHERE name = 'Ruby';

UPDATE ranks SET required_left_pv = 0, required_right_pv = 0,
    required_downline_rank_id = (SELECT id FROM ranks WHERE name = 'Pearl'),
    required_downline_count = 2, personal_activity_pv = 250
WHERE name = 'Zümrüt';

UPDATE ranks SET required_left_pv = 500000, required_right_pv = 500000,
    required_downline_rank_id = (SELECT id FROM ranks WHERE name = 'Safir'),
    required_downline_count = 2, personal_activity_pv = 250
WHERE name = 'Diamond';

UPDATE ranks SET required_left_pv = 0, required_right_pv = 0,
    required_downline_rank_id = (SELECT id FROM ranks WHERE name = 'Ruby'),
    required_downline_count = 2, personal_activity_pv = 250
WHERE name = 'Blue Diamond';

UPDATE ranks SET required_left_pv = 0, required_right_pv = 0,
    required_downline_rank_id = (SELECT id FROM ranks WHERE name = 'Zümrüt'),
    required_downline_count = 2, personal_activity_pv = 250
WHERE name = 'Green Diamond';

UPDATE ranks SET required_left_pv = 0, required_right_pv = 0,
    required_downline_rank_id = (SELECT id FROM ranks WHERE name = 'Diamond'),
    required_downline_count = 2, personal_activity_pv = 250
WHERE name = 'Red Diamond';

UPDATE ranks SET required_left_pv = 0, required_right_pv = 0,
    required_downline_rank_id = (SELECT id FROM ranks WHERE name = 'Blue Diamond'),
    required_downline_count = 2, personal_activity_pv = 250
WHERE name = 'Black Diamond';

UPDATE ranks SET required_left_pv = 0, required_right_pv = 0,
    required_downline_rank_id = (SELECT id FROM ranks WHERE name = 'Green Diamond'),
    required_downline_count = 2, personal_activity_pv = 250
WHERE name = 'President';

UPDATE ranks SET required_left_pv = 0, required_right_pv = 0,
    required_downline_rank_id = (SELECT id FROM ranks WHERE name = 'Red Diamond'),
    required_downline_count = 2, personal_activity_pv = 250
WHERE name = 'Ambassador';
