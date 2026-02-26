-- Ampliar el CHECK constraint d'announcement_mode per incloure 'none'
ALTER TABLE display_settings
  DROP CONSTRAINT IF EXISTS display_settings_announcement_mode_check;

ALTER TABLE display_settings
  ADD CONSTRAINT display_settings_announcement_mode_check
  CHECK (announcement_mode IN ('video', 'video_360p', 'slideshow', 'none'));
