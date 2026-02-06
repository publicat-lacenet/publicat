-- Trigger per assignar automàticament zone_id als vídeos basant-se en el centre
CREATE OR REPLACE FUNCTION set_video_zone_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Obtenir zone_id del centre
  SELECT zone_id INTO NEW.zone_id
  FROM centers
  WHERE id = NEW.center_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger per INSERT
CREATE TRIGGER tr_videos_set_zone_id
  BEFORE INSERT ON videos
  FOR EACH ROW
  EXECUTE FUNCTION set_video_zone_id();

-- Crear trigger per UPDATE (per si canvia el center_id)
CREATE TRIGGER tr_videos_update_zone_id
  BEFORE UPDATE OF center_id ON videos
  FOR EACH ROW
  WHEN (OLD.center_id IS DISTINCT FROM NEW.center_id)
  EXECUTE FUNCTION set_video_zone_id();

-- Nota: Els vídeos existents s'han actualitzat manualment amb:
-- UPDATE videos v SET zone_id = c.zone_id FROM centers c WHERE v.center_id = c.id AND v.zone_id IS NULL;
