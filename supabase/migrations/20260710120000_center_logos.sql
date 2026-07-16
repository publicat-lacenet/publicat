-- Logos obligatoris de centre i bucket public només de lectura des del client.

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'center-logos',
  'center-logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- No s'afegeixen policies INSERT/UPDATE/DELETE per a storage.objects:
-- el client no pot escriure al bucket; l'API autenticada fa servir service_role.

UPDATE public.centers
SET logo_url = '/logo_videos.png'
WHERE logo_url IS NULL OR btrim(logo_url) = '';

ALTER TABLE public.centers
  ALTER COLUMN logo_url SET DEFAULT '/logo_videos.png',
  ALTER COLUMN logo_url SET NOT NULL;

ALTER TABLE public.centers
  DROP CONSTRAINT IF EXISTS centers_logo_url_not_blank,
  ADD CONSTRAINT centers_logo_url_not_blank CHECK (btrim(logo_url) <> '');

COMMIT;
