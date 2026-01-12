-- M3c: Sistema de Moderació d'Alumnes
-- Data: 2026-01-12
-- Descripció: Triggers de notificacions, RLS policies per editor_alumne, i índexs optimitzats

-- ============================================================================
-- 1. VERIFICAR TAULA NOTIFICATIONS (ja creada a M1)
-- ============================================================================

-- Confirmar que la taula notifications té tots els camps necessaris
DO $$
BEGIN
  -- Verificar que la taula existeix
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    RAISE EXCEPTION 'La taula notifications no existeix. Executa primer les migracions M1.';
  END IF;

  -- Verificar camps essencials
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'video_id') THEN
    RAISE EXCEPTION 'La taula notifications no té el camp video_id';
  END IF;
END $$;

-- ============================================================================
-- 2. OPTIMITZAR ÍNDEX DE NOTIFICATIONS
-- ============================================================================

-- Eliminar índex antic si existeix
DROP INDEX IF EXISTS idx_notifications_user_unread;

-- Crear índex parcial optimitzat (només notificacions no llegides)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, created_at DESC)
WHERE is_read = false;

-- Índex per totes les notificacions (llegides i no llegides)
CREATE INDEX IF NOT EXISTS idx_notifications_user_all
ON notifications(user_id, created_at DESC);

-- ============================================================================
-- 3. TRIGGER: notify_pending_video()
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_pending_video()
RETURNS TRIGGER AS $$
DECLARE
  author_name TEXT;
  video_title TEXT;
  profe_record RECORD;
BEGIN
  -- Només notificar si el vídeo està pendent d'aprovació
  IF NEW.status != 'pending_approval' THEN
    RETURN NEW;
  END IF;

  -- Obtenir nom de l'autor
  BEGIN
    SELECT full_name INTO author_name
    FROM users
    WHERE id = NEW.uploaded_by_user_id;

    IF author_name IS NULL THEN
      author_name := 'Usuari desconegut';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      author_name := 'Usuari desconegut';
      RAISE NOTICE 'Error obtenint nom autor: %', SQLERRM;
  END;

  video_title := NEW.title;

  -- Crear notificació per cada Editor-profe del mateix centre
  BEGIN
    FOR profe_record IN
      SELECT id
      FROM users
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
        created_at
      ) VALUES (
        profe_record.id,
        'video_pending',
        'Nou vídeo pendent d''aprovació',
        format('%s ha pujat el vídeo "%s"', author_name, video_title),
        NEW.id,
        now()
      );
    END LOOP;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error creant notificacions: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger per vídeos nous
DROP TRIGGER IF EXISTS on_video_pending ON videos;
CREATE TRIGGER on_video_pending
  AFTER INSERT ON videos
  FOR EACH ROW
  EXECUTE FUNCTION notify_pending_video();

-- ============================================================================
-- 4. TRIGGER: notify_video_approved()
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_video_approved()
RETURNS TRIGGER AS $$
DECLARE
  video_title TEXT;
BEGIN
  -- Només notificar si passa de pending a published
  IF OLD.status = 'pending_approval' AND NEW.status = 'published' THEN

    video_title := NEW.title;

    BEGIN
      -- Crear notificació per l'autor del vídeo
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        video_id,
        created_at
      ) VALUES (
        NEW.uploaded_by_user_id,
        'video_approved',
        'Vídeo aprovat',
        format('El teu vídeo "%s" ha estat aprovat', video_title),
        NEW.id,
        now()
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creant notificació aprovació: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger per canvis d'estat
DROP TRIGGER IF EXISTS on_video_status_change ON videos;
CREATE TRIGGER on_video_status_change
  AFTER UPDATE OF status ON videos
  FOR EACH ROW
  EXECUTE FUNCTION notify_video_approved();

-- ============================================================================
-- 5. TRIGGER: notify_video_rejected()
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_video_rejected()
RETURNS TRIGGER AS $$
DECLARE
  video_title TEXT;
  author_id UUID;
BEGIN
  -- Només notificar si el vídeo estava pendent
  IF OLD.status = 'pending_approval' THEN

    video_title := OLD.title;
    author_id := OLD.uploaded_by_user_id;

    BEGIN
      -- Crear notificació per l'autor
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        video_id,
        created_at
      ) VALUES (
        author_id,
        'video_rejected',
        'Vídeo rebutjat',
        format('El teu vídeo "%s" no ha estat aprovat', video_title),
        NULL, -- video_id null perquè s'esborrarà
        now()
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creant notificació rebuig: %', SQLERRM;
    END;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger BEFORE DELETE
DROP TRIGGER IF EXISTS on_video_rejected ON videos;
CREATE TRIGGER on_video_rejected
  BEFORE DELETE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION notify_video_rejected();

-- ============================================================================
-- 6. RLS POLICIES PER EDITOR-ALUMNE
-- ============================================================================

-- Eliminar policies antigues si existeixen
DROP POLICY IF EXISTS "Editor-alumne can create videos" ON videos;
DROP POLICY IF EXISTS "Editor-alumne can view own pending and all published" ON videos;

-- Editor-alumne pot crear vídeos (queden pending_approval)
-- Nota: No utilitzem subconsultes per evitar recursió infinita
CREATE POLICY "Editor-alumne can create videos"
  ON videos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'editor_alumne'
        AND users.center_id = videos.center_id
        AND users.onboarding_status = 'active'
    )
  );

-- Editor-alumne pot veure:
-- 1. Els seus vídeos pendents
-- 2. Tots els vídeos publicats del seu centre
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
      (status = 'pending_approval' AND uploaded_by_user_id = auth.uid())
      OR status = 'published'
    )
  );

-- Editor-alumne NO pot editar ni esborrar vídeos (ni propis ni d'altres)
-- No cal crear policies per UPDATE/DELETE

-- ============================================================================
-- 7. ACTUALITZAR RLS POLICIES PER EDITOR-PROFE
-- ============================================================================

-- Eliminar policies antigues
DROP POLICY IF EXISTS "Editor-profe can view all center videos" ON videos;
DROP POLICY IF EXISTS "Editor-profe can approve videos" ON videos;
DROP POLICY IF EXISTS "Editor-profe can delete videos" ON videos;

-- Editor-profe pot veure TOTS els vídeos del centre (pending i published)
CREATE POLICY "Editor-profe can view all center videos"
  ON videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'editor_profe'
        AND users.center_id = videos.center_id
        AND users.onboarding_status = 'active'
    )
  );

-- Editor-profe pot aprovar vídeos (UPDATE status)
CREATE POLICY "Editor-profe can approve videos"
  ON videos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'editor_profe'
        AND users.center_id = videos.center_id
        AND users.onboarding_status = 'active'
    )
  );

-- Editor-profe pot esborrar vídeos (rebutjar)
CREATE POLICY "Editor-profe can delete videos"
  ON videos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'editor_profe'
        AND users.center_id = videos.center_id
        AND users.onboarding_status = 'active'
    )
  );

-- ============================================================================
-- 8. RLS POLICIES PER NOTIFICATIONS
-- ============================================================================

-- Assegurar que RLS està activat
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Eliminar policies antigues si existeixen
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- Usuari només pot veure les seves notificacions
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Usuari pot marcar com llegides les seves notificacions
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usuari pot esborrar les seves notificacions (opcional)
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 9. VERIFICACIÓ FINAL
-- ============================================================================

DO $$
DECLARE
  trigger_count INT;
  policy_count INT;
BEGIN
  -- Verificar triggers
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname IN ('on_video_pending', 'on_video_status_change', 'on_video_rejected');

  IF trigger_count < 3 THEN
    RAISE WARNING 'No tots els triggers s''han creat correctament. Esperats: 3, Trobats: %', trigger_count;
  ELSE
    RAISE NOTICE '✅ Tots els triggers creats correctament: %', trigger_count;
  END IF;

  -- Verificar policies de videos
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'videos'
    AND policyname LIKE '%alumne%' OR policyname LIKE '%profe%';

  RAISE NOTICE '✅ Policies de vídeos creades: %', policy_count;

  -- Verificar policies de notifications
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'notifications';

  IF policy_count < 3 THEN
    RAISE WARNING 'No totes les policies de notifications s''han creat. Esperats: 3, Trobats: %', policy_count;
  ELSE
    RAISE NOTICE '✅ Policies de notifications creades: %', policy_count;
  END IF;
END $$;

-- ============================================================================
-- FI DE LA MIGRACIÓ M3c
-- ============================================================================
