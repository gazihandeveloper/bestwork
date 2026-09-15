-- Rütbe adlarını İngilizceye çevir (kariyer sistemi İngilizce).
--   Safir  -> Sapphire
--   Zümrüt -> Emerald
-- Diğer rütbeler (Jade, Pearl, Ruby, Diamond ...) zaten İngilizce.
-- Büyük harf gösteriminde Türkçe "İ" oluşmaması için arayüz tarafı da
-- toUpperCase() kullanır.
UPDATE ranks SET name = 'Sapphire' WHERE name = 'Safir';
UPDATE ranks SET name = 'Emerald'  WHERE name = 'Zümrüt';
