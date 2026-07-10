-- Enforce weekday ticker scope at database level.

CREATE OR REPLACE FUNCTION validate_ticker_message_playlist_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  playlist_record record;
BEGIN
  IF NEW.playlist_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT center_id, kind
  INTO playlist_record
  FROM playlists
  WHERE id = NEW.playlist_id;

  IF playlist_record.center_id IS DISTINCT FROM NEW.center_id
     OR playlist_record.kind <> 'weekday' THEN
    RAISE EXCEPTION 'ticker_messages.playlist_id must reference a weekday playlist from the same center'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ticker_message_playlist_scope ON ticker_messages;

CREATE TRIGGER trg_validate_ticker_message_playlist_scope
  BEFORE INSERT OR UPDATE OF center_id, playlist_id ON ticker_messages
  FOR EACH ROW
  EXECUTE FUNCTION validate_ticker_message_playlist_scope();

REVOKE EXECUTE ON FUNCTION validate_ticker_message_playlist_scope() FROM PUBLIC;
