-- 0021_tree_parent_index.sql
-- Binary ağaç sorguları için kullanılabilir indeks.
--
-- SORUN: Mevcut users_binary_position_idx KISMİ bir indekstir:
--   ... (parent_id, "position") WHERE parent_id IS NOT NULL AND position IS NOT NULL
-- PostgreSQL, kısmi indeksi yalnızca sorgunun WHERE koşulu indeks koşulunu
-- KANITLADIĞINDA kullanır. `WHERE parent_id = $1` sorgusu "position IS NOT NULL"
-- koşulunu kanıtlamadığı için indeks kullanılamıyor ve planlayıcı SIRALI TARAMA
-- (Seq Scan) yapıyordu. 50.000 düğümlük testte tek düğüm sorgusu ~11,6 ms /
-- ~1.500 buffer tutuyordu; milyonlarda bu kabul edilemez.
--
-- ÇÖZÜM: Kısmi olmayan (parent_id, position) indeksi. Böylece "bir düğümün
-- çocukları" sorgusu indeks taramasıyla sabit maliyete iner. ORDER BY position
-- de aynı indeksten karşılanır (ek sıralama yok).
--
-- Not: Benzersizlik kısıtı (users_binary_position_idx) yerinde kalır; bu yalnızca
-- arama performansı içindir.

CREATE INDEX IF NOT EXISTS users_parent_position_idx
  ON users (parent_id, position);

-- Ağaç yukarı yürüyüşü (yetki kontrolü) ve sponsor sorguları için mevcut
-- users_pkey yeterlidir; ek indeks gerekmez.
