-- Fix: Eliminar trigger duplicat de notificacions
-- Data: 2026-01-26
-- Problema: Dos triggers (on_video_pending i tr_video_pending_notification)
--           executaven la mateixa funció notify_pending_video(), causant
--           notificacions duplicades.

-- ============================================================================
-- 1. ELIMINAR TRIGGER DUPLICAT
-- ============================================================================

-- El trigger tr_video_pending_notification va ser creat a M1
-- El trigger on_video_pending va ser creat a M3c (versió millorada)
-- Mantenim on_video_pending i eliminem tr_video_pending_notification

DROP TRIGGER IF EXISTS tr_video_pending_notification ON videos;

-- Verificar que només queda un trigger per notify_pending_video
DO $$
DECLARE
  trigger_count INT;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE event_object_table = 'videos'
    AND action_statement LIKE '%notify_pending_video%';

  IF trigger_count != 1 THEN
    RAISE WARNING 'Esperat 1 trigger per notify_pending_video, trobats: %', trigger_count;
  ELSE
    RAISE NOTICE '✅ Trigger duplicat eliminat correctament. Triggers restants: %', trigger_count;
  END IF;
END $$;

-- ============================================================================
-- 2. NETEJAR NOTIFICACIONS DUPLICADES EXISTENTS
-- ============================================================================

-- Comptar duplicats abans de netejar
DO $$
DECLARE
  duplicates_count INT;
BEGIN
  SELECT COUNT(*) INTO duplicates_count
  FROM (
    SELECT video_id, user_id, type
    FROM notifications
    WHERE type = 'video_pending'
    GROUP BY video_id, user_id, type
    HAVING COUNT(*) > 1
  ) AS dups;

  RAISE NOTICE 'Notificacions duplicades trobades: %', duplicates_count;
END $$;

-- Eliminar duplicats mantenint la notificació més antiga (id més petit)
DELETE FROM notifications a
USING notifications b
WHERE a.id > b.id
  AND a.video_id IS NOT NULL
  AND b.video_id IS NOT NULL
  AND a.video_id = b.video_id
  AND a.user_id = b.user_id
  AND a.type = b.type;

-- Verificar que no queden duplicats
DO $$
DECLARE
  remaining_duplicates INT;
BEGIN
  SELECT COUNT(*) INTO remaining_duplicates
  FROM (
    SELECT video_id, user_id, type
    FROM notifications
    WHERE type = 'video_pending'
    GROUP BY video_id, user_id, type
    HAVING COUNT(*) > 1
  ) AS dups;

  IF remaining_duplicates > 0 THEN
    RAISE WARNING 'Encara queden % duplicats', remaining_duplicates;
  ELSE
    RAISE NOTICE '✅ Totes les notificacions duplicades eliminades';
  END IF;
END $$;

-- ============================================================================
-- FI DE LA MIGRACIÓ
-- ============================================================================
