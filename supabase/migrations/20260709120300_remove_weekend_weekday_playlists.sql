-- Remove obsolete weekend weekday playlists from the old 7-day default model.

DO $$
DECLARE
  dependent_items integer;
  dependent_overrides integer;
  dependent_tickers integer;
  deleted_playlists integer;
BEGIN
  SELECT count(*)
  INTO dependent_items
  FROM playlist_items pi
  JOIN playlists p ON p.id = pi.playlist_id
  WHERE p.kind = 'weekday'
    AND p.name IN ('Dissabte', 'Diumenge');

  SELECT count(*)
  INTO dependent_overrides
  FROM schedule_overrides so
  JOIN playlists p ON p.id = so.playlist_id
  WHERE p.kind = 'weekday'
    AND p.name IN ('Dissabte', 'Diumenge');

  SELECT count(*)
  INTO dependent_tickers
  FROM ticker_messages tm
  JOIN playlists p ON p.id = tm.playlist_id
  WHERE p.kind = 'weekday'
    AND p.name IN ('Dissabte', 'Diumenge');

  IF dependent_items > 0 OR dependent_overrides > 0 OR dependent_tickers > 0 THEN
    RAISE EXCEPTION
      'Cannot remove weekend weekday playlists: items %, overrides %, tickers %',
      dependent_items,
      dependent_overrides,
      dependent_tickers
      USING ERRCODE = '23514';
  END IF;

  DELETE FROM playlists
  WHERE kind = 'weekday'
    AND name IN ('Dissabte', 'Diumenge');

  GET DIAGNOSTICS deleted_playlists = ROW_COUNT;
  RAISE NOTICE 'Removed % obsolete weekend weekday playlists', deleted_playlists;
END;
$$;
