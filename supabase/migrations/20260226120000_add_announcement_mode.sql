-- Afegir camp announcement_mode a display_settings
ALTER TABLE display_settings
  ADD COLUMN IF NOT EXISTS announcement_mode text NOT NULL DEFAULT 'video'
  CHECK (announcement_mode IN ('video', 'video_360p', 'slideshow'));

-- Afegir camp frames_urls a videos (fotogrames JPEG per al mode slideshow)
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS frames_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
