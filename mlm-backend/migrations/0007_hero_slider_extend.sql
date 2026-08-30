-- 0007_hero_slider_extend.sql
-- Slider yönetimi genişletmesi: açıklama + özelleştirilebilir butonlar.
ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS primary_button_text VARCHAR(80);
ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS primary_button_link VARCHAR(255);
ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS secondary_button_text VARCHAR(80);
ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS secondary_button_link VARCHAR(255);
ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS show_buttons BOOLEAN NOT NULL DEFAULT TRUE;
