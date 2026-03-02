-- Add configurable image height percentage to RSS center settings
ALTER TABLE rss_center_settings
  ADD COLUMN IF NOT EXISTS image_height_percent INT NOT NULL DEFAULT 50;

ALTER TABLE rss_center_settings
  ADD CONSTRAINT rss_center_settings_image_height_check
  CHECK (image_height_percent IN (30, 40, 50, 60, 70));
