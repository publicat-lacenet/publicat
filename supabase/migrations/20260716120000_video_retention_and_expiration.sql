-- Política de conservació i eliminació automàtica de vídeos.

CREATE TYPE public.video_retention_policy AS ENUM (
  'end_of_school_year',
  'indefinite',
  'custom_date'
);

ALTER TABLE public.videos
  ADD COLUMN retention_policy public.video_retention_policy,
  ADD COLUMN delete_on date;

-- Els vídeos anteriors al canvi es conserven indefinidament.
UPDATE public.videos
SET retention_policy = 'indefinite',
    delete_on = NULL;

ALTER TABLE public.videos
  ALTER COLUMN retention_policy SET DEFAULT 'end_of_school_year',
  ALTER COLUMN retention_policy SET NOT NULL;

ALTER TABLE public.videos
  ADD CONSTRAINT videos_retention_consistency CHECK (
    (retention_policy = 'indefinite' AND delete_on IS NULL)
    OR
    (retention_policy = 'end_of_school_year'
      AND delete_on IS NOT NULL
      AND EXTRACT(MONTH FROM delete_on) = 7
      AND EXTRACT(DAY FROM delete_on) = 31)
    OR
    (retention_policy = 'custom_date' AND delete_on IS NOT NULL)
  );

CREATE INDEX idx_videos_expiration
  ON public.videos (delete_on, created_at)
  WHERE delete_on IS NOT NULL;

CREATE OR REPLACE FUNCTION private.normalize_video_retention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_today date := (pg_catalog.now() AT TIME ZONE 'Europe/Madrid')::date;
  v_end_of_school_year date;
BEGIN
  IF NEW.retention_policy = 'indefinite' THEN
    NEW.delete_on := NULL;
    RETURN NEW;
  END IF;

  IF NEW.retention_policy = 'end_of_school_year' THEN
    v_end_of_school_year := pg_catalog.make_date(
      EXTRACT(YEAR FROM v_today)::integer,
      7,
      31
    );

    IF v_today > v_end_of_school_year THEN
      v_end_of_school_year := pg_catalog.make_date(
        EXTRACT(YEAR FROM v_today)::integer + 1,
        7,
        31
      );
    END IF;

    NEW.delete_on := v_end_of_school_year;
    RETURN NEW;
  END IF;

  IF NEW.retention_policy = 'custom_date' THEN
    IF NEW.delete_on IS NULL THEN
      RAISE EXCEPTION 'Cal indicar una data de conservació';
    END IF;

    IF NEW.delete_on < v_today THEN
      RAISE EXCEPTION 'La data de conservació no pot ser anterior a avui';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Política de conservació no vàlida';
END;
$$;

REVOKE ALL ON FUNCTION private.normalize_video_retention() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER tr_normalize_video_retention
  BEFORE INSERT OR UPDATE OF retention_policy, delete_on
  ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION private.normalize_video_retention();

-- Helper intern compartit per l'eliminació manual i l'automàtica.
CREATE OR REPLACE FUNCTION private.delete_video_and_queue_cleanup_internal(
  p_video_id uuid,
  p_deletion_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_video public.videos%ROWTYPE;
  v_playlist_ids uuid[];
  v_playlist_id uuid;
  v_frame_url text;
  v_frame_path text;
BEGIN
  SELECT *
  INTO v_video
  FROM public.videos
  WHERE id = p_video_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vídeo no trobat';
  END IF;

  SELECT COALESCE(pg_catalog.array_agg(DISTINCT playlist_id), ARRAY[]::uuid[])
  INTO v_playlist_ids
  FROM public.playlist_items
  WHERE video_id = p_video_id;

  PERFORM pg_catalog.set_config(
    'publicat.video_deletion_reason',
    COALESCE(p_deletion_reason, 'manual'),
    true
  );

  DELETE FROM public.videos
  WHERE id = p_video_id;

  IF v_video.vimeo_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.videos
      WHERE vimeo_id = v_video.vimeo_id
    ) THEN
    INSERT INTO public.media_cleanup_jobs (
      video_id,
      resource_type,
      resource_identifier
    )
    VALUES (
      p_video_id,
      'vimeo_video',
      v_video.vimeo_id
    )
    ON CONFLICT (resource_type, resource_identifier) DO NOTHING;
  END IF;

  FOR v_frame_url IN
    SELECT pg_catalog.jsonb_array_elements_text(
      COALESCE(v_video.frames_urls, '[]'::jsonb)
    )
  LOOP
    v_frame_path := substring(
      v_frame_url FROM '/storage/v1/object/public/announcement-frames/(.+)$'
    );

    IF v_frame_path IS NOT NULL AND v_frame_path <> '' THEN
      INSERT INTO public.media_cleanup_jobs (
        video_id,
        resource_type,
        resource_identifier
      )
      VALUES (
        p_video_id,
        'announcement_frame',
        v_frame_path
      )
      ON CONFLICT (resource_type, resource_identifier) DO NOTHING;
    END IF;
  END LOOP;

  FOREACH v_playlist_id IN ARRAY v_playlist_ids
  LOOP
    PERFORM public.reindex_playlist_items(v_playlist_id);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION private.delete_video_and_queue_cleanup_internal(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.delete_video_and_queue_cleanup(p_video_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_video public.videos%ROWTYPE;
  v_role public.user_role;
  v_center_id uuid;
BEGIN
  SELECT role, center_id
  INTO v_role, v_center_id
  FROM public.users
  WHERE id = (SELECT auth.uid());

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Perfil d''usuari no trobat';
  END IF;

  IF v_role NOT IN ('editor_profe', 'admin_global') THEN
    RAISE EXCEPTION 'No tens permisos per eliminar aquest vídeo';
  END IF;

  SELECT *
  INTO v_video
  FROM public.videos
  WHERE id = p_video_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vídeo no trobat';
  END IF;

  IF v_role <> 'admin_global' AND v_video.center_id <> v_center_id THEN
    RAISE EXCEPTION 'No tens permisos per eliminar aquest vídeo';
  END IF;

  PERFORM private.delete_video_and_queue_cleanup_internal(p_video_id, 'manual');
END;
$$;

REVOKE ALL ON FUNCTION public.delete_video_and_queue_cleanup(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_video_and_queue_cleanup(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_expired_videos()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_video_id uuid;
  v_deleted integer := 0;
  v_today date := (pg_catalog.now() AT TIME ZONE 'Europe/Madrid')::date;
BEGIN
  FOR v_video_id IN
    SELECT id
    FROM public.videos
    WHERE delete_on < v_today
    ORDER BY delete_on, created_at
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM private.delete_video_and_queue_cleanup_internal(
      v_video_id,
      'expiration'
    );
    v_deleted := v_deleted + 1;
  END LOOP;

  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_expired_videos()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_expired_videos() TO service_role;

CREATE OR REPLACE FUNCTION public.notify_video_rejected()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deletion_reason text := pg_catalog.current_setting(
    'publicat.video_deletion_reason',
    true
  );
BEGIN
  IF v_deletion_reason = 'expiration' THEN
    RETURN OLD;
  END IF;

  IF OLD.status = 'pending_approval' THEN
    BEGIN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        video_id,
        created_at
      )
      VALUES (
        OLD.uploaded_by_user_id,
        'video_rejected',
        'Vídeo rebutjat',
        pg_catalog.format(
          'El teu vídeo "%s" no ha estat aprovat',
          OLD.title
        ),
        NULL,
        pg_catalog.now()
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creant notificació rebuig: %', SQLERRM;
    END;
  END IF;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_video_rejected()
  FROM PUBLIC, anon, authenticated;

-- La substitució d'un vídeo en revisió també actualitza la conservació
-- dins la mateixa transacció.
DROP FUNCTION public.replace_revision_vimeo_and_queue_cleanup(
  uuid,
  text,
  text,
  public.video_type,
  text,
  text,
  text,
  text,
  integer,
  jsonb
);

CREATE FUNCTION public.replace_revision_vimeo_and_queue_cleanup(
  p_video_id uuid,
  p_title text,
  p_description text,
  p_type public.video_type,
  p_vimeo_url text,
  p_vimeo_id text,
  p_vimeo_hash text,
  p_thumbnail_url text,
  p_duration_seconds integer,
  p_frames_urls jsonb,
  p_retention_policy public.video_retention_policy,
  p_delete_on date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_video public.videos%ROWTYPE;
  v_role public.user_role;
  v_frame_url text;
  v_frame_path text;
BEGIN
  SELECT role
  INTO v_role
  FROM public.users
  WHERE id = (SELECT auth.uid());

  IF v_role <> 'editor_alumne' THEN
    RAISE EXCEPTION 'Sense permisos per enviar revisió';
  END IF;

  SELECT *
  INTO v_video
  FROM public.videos
  WHERE id = p_video_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vídeo no trobat';
  END IF;

  IF v_video.status <> 'needs_revision' THEN
    RAISE EXCEPTION 'Només es pot corregir un vídeo en revisió';
  END IF;

  IF v_video.uploaded_by_user_id <> (SELECT auth.uid()) THEN
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
      retention_policy = p_retention_policy,
      delete_on = p_delete_on,
      status = 'pending_approval',
      rejection_comment = NULL,
      rejected_at = NULL,
      rejected_by_user_id = NULL
  WHERE id = p_video_id;

  IF v_video.vimeo_id IS NOT NULL
    AND v_video.vimeo_id <> p_vimeo_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.videos
      WHERE vimeo_id = v_video.vimeo_id
    ) THEN
    INSERT INTO public.media_cleanup_jobs (
      video_id,
      resource_type,
      resource_identifier
    )
    VALUES (
      p_video_id,
      'vimeo_video',
      v_video.vimeo_id
    )
    ON CONFLICT (resource_type, resource_identifier) DO NOTHING;
  END IF;

  FOR v_frame_url IN
    SELECT pg_catalog.jsonb_array_elements_text(
      COALESCE(v_video.frames_urls, '[]'::jsonb)
    )
  LOOP
    v_frame_path := substring(
      v_frame_url FROM '/storage/v1/object/public/announcement-frames/(.+)$'
    );

    IF v_frame_path IS NOT NULL AND v_frame_path <> '' THEN
      INSERT INTO public.media_cleanup_jobs (
        video_id,
        resource_type,
        resource_identifier
      )
      VALUES (
        p_video_id,
        'announcement_frame',
        v_frame_path
      )
      ON CONFLICT (resource_type, resource_identifier) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_revision_vimeo_and_queue_cleanup(
  uuid,
  text,
  text,
  public.video_type,
  text,
  text,
  text,
  text,
  integer,
  jsonb,
  public.video_retention_policy,
  date
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.replace_revision_vimeo_and_queue_cleanup(
  uuid,
  text,
  text,
  public.video_type,
  text,
  text,
  text,
  text,
  integer,
  jsonb,
  public.video_retention_policy,
  date
) TO authenticated;

COMMENT ON COLUMN public.videos.retention_policy IS
  'Política de conservació: final de curs, indefinida o data concreta.';

COMMENT ON COLUMN public.videos.delete_on IS
  'Últim dia inclusiu de conservació; el cron elimina el vídeo l''endemà.';
