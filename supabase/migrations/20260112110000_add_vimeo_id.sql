-- Afegir camp vimeo_id per optimitzar consultes a l'API de Vimeo
-- Data: 2026-01-12
-- Motiu: Tenir l'ID numèric separat evita haver de fer parsing de vimeo_url cada vegada

-- 1. Afegir el camp vimeo_id
ALTER TABLE videos ADD COLUMN IF NOT EXISTS vimeo_id text;

-- 2. Afegir comentari explicatiu
COMMENT ON COLUMN videos.vimeo_id IS 'ID numèric del vídeo a Vimeo (ex: 1153589462 extret de https://vimeo.com/1153589462)';

-- 3. Crear índex per millorar performance en consultes per vimeo_id
CREATE INDEX IF NOT EXISTS idx_videos_vimeo_id ON videos(vimeo_id);

-- 4. Extreure vimeo_id de vimeo_url per als vídeos existents
-- Suporta formats:
--   - https://vimeo.com/123456789
--   - https://vimeo.com/123456789/e03029570e (unlisted amb hash)
--   - https://player.vimeo.com/video/123456789
UPDATE videos
SET vimeo_id =
  CASE
    -- Format: https://vimeo.com/123456789 o https://vimeo.com/123456789/hash
    WHEN vimeo_url LIKE '%vimeo.com/%' AND vimeo_url NOT LIKE '%player.vimeo.com%' THEN
      SPLIT_PART(
        SPLIT_PART(vimeo_url, 'vimeo.com/', 2),
        '/',
        1
      )
    -- Format: https://player.vimeo.com/video/123456789
    WHEN vimeo_url LIKE '%player.vimeo.com/video/%' THEN
      SPLIT_PART(
        SPLIT_PART(vimeo_url, 'video/', 2),
        '?',
        1
      )
    ELSE NULL
  END
WHERE vimeo_id IS NULL AND vimeo_url IS NOT NULL;

-- 5. Verificació: Mostrar resultats de la migració (només informatiu)
DO $$
DECLARE
  total_videos INT;
  videos_amb_id INT;
  videos_sense_id INT;
BEGIN
  SELECT COUNT(*) INTO total_videos FROM videos;
  SELECT COUNT(*) INTO videos_amb_id FROM videos WHERE vimeo_id IS NOT NULL;
  SELECT COUNT(*) INTO videos_sense_id FROM videos WHERE vimeo_id IS NULL;

  RAISE NOTICE '📊 Migració vimeo_id completada:';
  RAISE NOTICE '   Total vídeos: %', total_videos;
  RAISE NOTICE '   Amb vimeo_id: %', videos_amb_id;
  RAISE NOTICE '   Sense vimeo_id: %', videos_sense_id;
END $$;
