-- Neteja durable de recursos externs quan s'elimina o se substitueix un vídeo.

CREATE TABLE public.media_cleanup_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN ('vimeo_video', 'announcement_frame')),
  resource_identifier text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_cleanup_jobs_resource_unique UNIQUE (resource_type, resource_identifier)
);

CREATE INDEX idx_media_cleanup_jobs_pending
  ON public.media_cleanup_jobs (next_attempt_at, created_at)
  WHERE status = 'pending';

ALTER TABLE public.media_cleanup_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.media_cleanup_jobs FROM anon, authenticated;

CREATE TRIGGER tr_media_cleanup_jobs_updated_at
  BEFORE UPDATE ON public.media_cleanup_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.reindex_playlist_items(p_playlist_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Desplacem temporalment les posicions per evitar la restricció UNIQUE durant la renumeració.
  UPDATE public.playlist_items
  SET position = -1000000000 - position
  WHERE playlist_id = p_playlist_id;

  WITH ordered AS (
    SELECT id, row_number() OVER (ORDER BY -1000000000 - position, id) - 1 AS new_position
    FROM public.playlist_items
    WHERE playlist_id = p_playlist_id
  )
  UPDATE public.playlist_items item
  SET position = ordered.new_position
  FROM ordered
  WHERE item.id = ordered.id;
END;
$$;

REVOKE ALL ON FUNCTION public.reindex_playlist_items(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_video_and_queue_cleanup(p_video_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_video public.videos%ROWTYPE;
  v_role public.user_role;
  v_center_id uuid;
  v_playlist_ids uuid[];
  v_playlist_id uuid;
  v_frame_url text;
  v_frame_path text;
BEGIN
  SELECT role, center_id INTO v_role, v_center_id
  FROM public.users WHERE id = auth.uid();

  IF v_role IS NULL THEN RAISE EXCEPTION 'Perfil d''usuari no trobat'; END IF;
  IF v_role NOT IN ('editor_profe', 'admin_global') THEN
    RAISE EXCEPTION 'No tens permisos per eliminar aquest vídeo';
  END IF;

  SELECT * INTO v_video FROM public.videos WHERE id = p_video_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vídeo no trobat'; END IF;
  IF v_role <> 'admin_global' AND v_video.center_id <> v_center_id THEN
    RAISE EXCEPTION 'No tens permisos per eliminar aquest vídeo';
  END IF;

  SELECT coalesce(array_agg(DISTINCT playlist_id), ARRAY[]::uuid[])
  INTO v_playlist_ids
  FROM public.playlist_items WHERE video_id = p_video_id;

  DELETE FROM public.videos WHERE id = p_video_id;

  IF v_video.vimeo_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.videos WHERE vimeo_id = v_video.vimeo_id) THEN
    INSERT INTO public.media_cleanup_jobs (video_id, resource_type, resource_identifier)
    VALUES (p_video_id, 'vimeo_video', v_video.vimeo_id)
    ON CONFLICT (resource_type, resource_identifier) DO NOTHING;
  END IF;

  FOR v_frame_url IN SELECT jsonb_array_elements_text(COALESCE(v_video.frames_urls, '[]'::jsonb)) LOOP
    v_frame_path := substring(v_frame_url FROM '/storage/v1/object/public/announcement-frames/(.+)$');
    IF v_frame_path IS NOT NULL AND v_frame_path <> '' THEN
      INSERT INTO public.media_cleanup_jobs (video_id, resource_type, resource_identifier)
      VALUES (p_video_id, 'announcement_frame', v_frame_path)
      ON CONFLICT (resource_type, resource_identifier) DO NOTHING;
    END IF;
  END LOOP;

  FOREACH v_playlist_id IN ARRAY v_playlist_ids LOOP
    PERFORM public.reindex_playlist_items(v_playlist_id);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_video_and_queue_cleanup(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_video_and_queue_cleanup(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.replace_revision_vimeo_and_queue_cleanup(
  p_video_id uuid,
  p_title text,
  p_description text,
  p_type public.video_type,
  p_vimeo_url text,
  p_vimeo_id text,
  p_vimeo_hash text,
  p_thumbnail_url text,
  p_duration_seconds integer,
  p_frames_urls jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_video public.videos%ROWTYPE;
  v_role public.user_role;
  v_frame_url text;
  v_frame_path text;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
  IF v_role <> 'editor_alumne' THEN
    RAISE EXCEPTION 'Sense permisos per enviar revisió';
  END IF;

  SELECT * INTO v_video FROM public.videos WHERE id = p_video_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vídeo no trobat'; END IF;
  IF v_video.status <> 'needs_revision' THEN
    RAISE EXCEPTION 'Només es pot corregir un vídeo en revisió';
  END IF;
  IF v_video.uploaded_by_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Només pots corregir els teus propis vídeos';
  END IF;

  UPDATE public.videos
  SET title = p_title,
      description = p_description,
      type = p_type,
      vimeo_url = p_vimeo_url,
      vimeo_id = p_vimeo_id,
      vimeo_hash = p_vimeo_hash,
      thumbnail_url = p_thumbnail_url,
      duration_seconds = p_duration_seconds,
      frames_urls = COALESCE(p_frames_urls, '[]'::jsonb),
      status = 'pending_approval',
      rejection_comment = NULL,
      rejected_at = NULL,
      rejected_by_user_id = NULL
  WHERE id = p_video_id;

  IF v_video.vimeo_id IS NOT NULL
    AND v_video.vimeo_id <> p_vimeo_id
    AND NOT EXISTS (SELECT 1 FROM public.videos WHERE vimeo_id = v_video.vimeo_id) THEN
    INSERT INTO public.media_cleanup_jobs (video_id, resource_type, resource_identifier)
    VALUES (p_video_id, 'vimeo_video', v_video.vimeo_id)
    ON CONFLICT (resource_type, resource_identifier) DO NOTHING;
  END IF;

  FOR v_frame_url IN SELECT jsonb_array_elements_text(COALESCE(v_video.frames_urls, '[]'::jsonb)) LOOP
    v_frame_path := substring(v_frame_url FROM '/storage/v1/object/public/announcement-frames/(.+)$');
    IF v_frame_path IS NOT NULL AND v_frame_path <> '' THEN
      INSERT INTO public.media_cleanup_jobs (video_id, resource_type, resource_identifier)
      VALUES (p_video_id, 'announcement_frame', v_frame_path)
      ON CONFLICT (resource_type, resource_identifier) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_revision_vimeo_and_queue_cleanup(uuid, text, text, public.video_type, text, text, text, text, integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_revision_vimeo_and_queue_cleanup(uuid, text, text, public.video_type, text, text, text, text, integer, jsonb) TO authenticated;

-- Reparació única de les posicions que ja tenien salts abans d'aquest canvi.
DO $$
DECLARE
  v_playlist_id uuid;
BEGIN
  FOR v_playlist_id IN SELECT id FROM public.playlists LOOP
    PERFORM public.reindex_playlist_items(v_playlist_id);
  END LOOP;
END;
$$;
