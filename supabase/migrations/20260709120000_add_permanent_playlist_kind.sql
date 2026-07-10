-- Add permanent playlist mode primitives.
-- Keep enum value creation separate so later statements can safely use it.

ALTER TYPE playlist_kind ADD VALUE IF NOT EXISTS 'permanent';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'display_playlist_mode'
  ) THEN
    EXECUTE 'CREATE TYPE display_playlist_mode AS ENUM (''permanent'', ''weekday'')';
  END IF;
END
$$;
