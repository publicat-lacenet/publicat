-- M3b: Afegir camp vimeo_hash per vídeos unlisted
-- Data: 2026-01-12

-- Afegir camp per guardar el hash de privacitat de Vimeo
-- Necessari per reproduir vídeos "unlisted"
ALTER TABLE videos ADD COLUMN IF NOT EXISTS vimeo_hash text;

-- Comentari explicatiu
COMMENT ON COLUMN videos.vimeo_hash IS 'Hash de privacitat per vídeos unlisted de Vimeo (ex: e03029570e de https://vimeo.com/123456789/e03029570e)';
