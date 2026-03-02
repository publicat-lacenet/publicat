-- M3d: Sistema de Feedback i Revisió de Vídeos
-- Data: 2026-02-27
-- Descripció: Nou estat needs_revision, columnes de feedback al professor,
--             RLS per editar vídeos en revisió, triggers de notificació.

-- IMPORTANT: La columna status de videos és de tipus ENUM (video_status).
-- Cal executar el PAS 1 sol primer, i el PAS 2 després (restricció de Postgres):
--   PAS 1: ALTER TYPE video_status ADD VALUE IF NOT EXISTS 'needs_revision';
--   PAS 2: La resta d'aquest fitxer.

-- ============================================================================
-- 1. AFEGIR VALOR A L'ENUM video_status (executar sol, pas previ)
-- ============================================================================
-- ALTER TYPE video_status ADD VALUE IF NOT EXISTS 'needs_revision';

-- ============================================================================
-- 2. NOVES COLUMNES A LA TAULA videos
-- ============================================================================

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS rejection_comment TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Índex per trobar vídeos en revisió d'un centre ràpidament
CREATE INDEX IF NOT EXISTS idx_videos_needs_revision
  ON videos(center_id, status)
  WHERE status = 'needs_revision';

-- ============================================================================
-- 3. ACTUALITZAR RLS SELECT PER A editor_alumne
--    (Afegir needs_revision als vídeos visibles per l'alumne propietari)
-- ============================================================================

DROP POLICY IF EXISTS "Editor-alumne can view videos" ON videos;

CREATE POLICY "Editor-alumne can view videos"
  ON videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'editor_alumne'
        AND users.center_id = videos.center_id
        AND users.onboarding_status = 'active'
    )
    AND (
      status = 'published'
      OR (
        status IN ('pending_approval', 'needs_revision')
        AND uploaded_by_user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- 4. NOVA RLS UPDATE PER A editor_alumne
--    (Permet editar els seus propis vídeos en needs_revision)
-- ============================================================================

DROP POLICY IF EXISTS "Editor-alumne can update own needs_revision videos" ON videos;

CREATE POLICY "Editor-alumne can update own needs_revision videos"
  ON videos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'editor_alumne'
        AND users.center_id = videos.center_id
        AND users.onboarding_status = 'active'
    )
    AND uploaded_by_user_id = auth.uid()
    AND status = 'needs_revision'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'editor_alumne'
        AND users.center_id = videos.center_id
        AND users.onboarding_status = 'active'
    )
    AND uploaded_by_user_id = auth.uid()
  );

-- ============================================================================
-- 5. TRIGGER: notify_video_needs_revision
--    (Notifica l'alumne quan el professor demana revisió)
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_video_needs_revision()
RETURNS TRIGGER AS $$
DECLARE
  video_title TEXT;
BEGIN
  -- Notificar quan status canvia pending_approval → needs_revision
  IF OLD.status = 'pending_approval' AND NEW.status = 'needs_revision' THEN
    video_title := NEW.title;

    BEGIN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        video_id,
        actor_user_id,
        created_at
      ) VALUES (
        NEW.uploaded_by_user_id,
        'video_needs_revision',
        'El teu vídeo necessita revisió',
        format('El professor ha demanat canvis al vídeo "%s".', video_title),
        NEW.id,
        NEW.rejected_by_user_id,
        now()
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creant notificació needs_revision: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_video_needs_revision ON videos;
CREATE TRIGGER on_video_needs_revision
  AFTER UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION notify_video_needs_revision();

-- ============================================================================
-- 6. TRIGGER: notify_video_resubmitted
--    (Notifica professors quan l'alumne torna a enviar el vídeo corregit)
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_video_resubmitted()
RETURNS TRIGGER AS $$
DECLARE
  profe_record RECORD;
  author_name TEXT;
BEGIN
  -- Quan status canvia needs_revision → pending_approval (re-enviament)
  IF OLD.status = 'needs_revision' AND NEW.status = 'pending_approval' THEN

    SELECT COALESCE(full_name, email) INTO author_name
    FROM users
    WHERE id = NEW.uploaded_by_user_id;

    author_name := COALESCE(author_name, 'L''alumne');

    BEGIN
      FOR profe_record IN
        SELECT id FROM users
        WHERE center_id = NEW.center_id
          AND role = 'editor_profe'
          AND onboarding_status = 'active'
      LOOP
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          video_id,
          actor_user_id,
          created_at
        ) VALUES (
          profe_record.id,
          'video_pending',
          'Vídeo revisat pendent d''aprovació',
          format('%s ha corregit el vídeo "%s" i l''ha tornat a enviar', author_name, NEW.title),
          NEW.id,
          NEW.uploaded_by_user_id,
          now()
        );
      END LOOP;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creant notificacions resubmit: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_video_resubmitted ON videos;
CREATE TRIGGER on_video_resubmitted
  AFTER UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION notify_video_resubmitted();

-- ============================================================================
-- 7. ACTUALITZAR CONSTRAINT DE TIPUS A notifications (si existeix)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notifications_type_check'
      AND conrelid = 'notifications'::regclass
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
      CHECK (type IN (
        'video_pending',
        'video_approved',
        'video_rejected',
        'video_needs_revision'
      ));
    RAISE NOTICE 'Constraint notifications_type_check actualitzat';
  ELSE
    RAISE NOTICE 'No hi ha constraint notifications_type_check, res a fer';
  END IF;
END $$;

-- ============================================================================
-- 8. VERIFICACIÓ FINAL
-- ============================================================================

DO $$
DECLARE
  col_count INT;
  trigger_count INT;
BEGIN
  -- Verificar columnes noves
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'videos'
    AND column_name IN ('rejection_comment', 'rejected_at', 'rejected_by_user_id');

  IF col_count < 3 THEN
    RAISE WARNING 'No totes les columnes noves s''han creat. Esperats: 3, Trobats: %', col_count;
  ELSE
    RAISE NOTICE '✅ 3 noves columnes creades a videos: rejection_comment, rejected_at, rejected_by_user_id';
  END IF;

  -- Verificar triggers nous
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname IN ('on_video_needs_revision', 'on_video_resubmitted');

  IF trigger_count < 2 THEN
    RAISE WARNING 'No tots els triggers nous s''han creat. Esperats: 2, Trobats: %', trigger_count;
  ELSE
    RAISE NOTICE '✅ 2 nous triggers creats: on_video_needs_revision, on_video_resubmitted';
  END IF;

  RAISE NOTICE '✅ Migració M3d completada correctament';
END $$;

-- ============================================================================
-- FI DE LA MIGRACIÓ M3d
-- ============================================================================
