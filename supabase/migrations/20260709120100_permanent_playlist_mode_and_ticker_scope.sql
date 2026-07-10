-- Llista permanent, default playback mode and weekday-specific ticker messages.

-- Allow permanent playlists as center-owned playlists.
ALTER TABLE playlists DROP CONSTRAINT IF EXISTS chk_playlist_center_kind;

ALTER TABLE playlists
  ADD CONSTRAINT chk_playlist_center_kind CHECK (
    (
      kind IN ('weekday', 'announcements', 'custom', 'permanent')
      AND center_id IS NOT NULL
    )
    OR (kind IN ('global', 'landing') AND center_id IS NULL)
    OR (kind = 'global' AND center_id IS NOT NULL AND origin_playlist_id IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_playlists_one_active_permanent_per_center
  ON playlists(center_id)
  WHERE kind = 'permanent' AND is_active = true;

-- Store the center's base playlist mode. Scheduled overrides still have priority.
ALTER TABLE display_settings
  ADD COLUMN IF NOT EXISTS default_playlist_mode display_playlist_mode NOT NULL DEFAULT 'permanent';

COMMENT ON COLUMN display_settings.default_playlist_mode IS
  'Mode habitual de playlist quan no hi ha cap schedule override actiu: permanent o weekday';

UPDATE display_settings
SET default_playlist_mode = 'permanent'
WHERE default_playlist_mode IS DISTINCT FROM 'permanent';

INSERT INTO display_settings (center_id, default_playlist_mode)
SELECT c.id, 'permanent'
FROM centers c
WHERE NOT EXISTS (
  SELECT 1
  FROM display_settings ds
  WHERE ds.center_id = c.id
);

-- Existing centers get one non-deletable permanent playlist, initially empty.
INSERT INTO playlists (center_id, name, kind, is_deletable, is_student_editable, is_active)
SELECT c.id, 'Llista permanent', 'permanent', false, false, true
FROM centers c
WHERE NOT EXISTS (
  SELECT 1
  FROM playlists p
  WHERE p.center_id = c.id
    AND p.kind = 'permanent'
    AND p.is_active = true
);

-- Ticker messages can remain general (playlist_id null) or be scoped to a weekday playlist.
ALTER TABLE ticker_messages
  ADD COLUMN IF NOT EXISTS playlist_id uuid REFERENCES playlists(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ticker_messages_center_playlist_position
  ON ticker_messages(center_id, playlist_id, position)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ticker_messages_playlist_position
  ON ticker_messages(playlist_id, position)
  WHERE playlist_id IS NOT NULL AND is_active = true;

COMMENT ON COLUMN ticker_messages.playlist_id IS
  'Playlist weekday associada al missatge; null indica ticker general del centre';

-- New centers receive the permanent playlist first, weekday playlists, announcements,
-- and a display_settings row with permanent mode.
CREATE OR REPLACE FUNCTION create_default_playlists_for_center()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO playlists (center_id, name, kind, is_deletable)
  VALUES
    (NEW.id, 'Llista permanent', 'permanent', false),
    (NEW.id, 'Dilluns', 'weekday', false),
    (NEW.id, 'Dimarts', 'weekday', false),
    (NEW.id, 'Dimecres', 'weekday', false),
    (NEW.id, 'Dijous', 'weekday', false),
    (NEW.id, 'Divendres', 'weekday', false),
    (NEW.id, 'Anuncis', 'announcements', false);

  INSERT INTO display_settings (center_id, default_playlist_mode)
  VALUES (NEW.id, 'permanent')
  ON CONFLICT (center_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_default_playlists_for_center() FROM PUBLIC;
