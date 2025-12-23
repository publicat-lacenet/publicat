-- Milestone 1.5: Automatismes (Triggers)
-- Descripció: Lògica reactiva per a integritat, automatització i notificacions.

-- 1. UTILITATS GENERALS

-- 1.1 Actualització de updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a totes les taules rellevants
CREATE TRIGGER tr_zones_updated_at BEFORE UPDATE ON zones FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_centers_updated_at BEFORE UPDATE ON centers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_videos_updated_at BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_playlists_updated_at BEFORE UPDATE ON playlists FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_tags_updated_at BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_hashtags_updated_at BEFORE UPDATE ON hashtags FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. SINCRONITZACIÓ D'USUARIS

-- 2.1 Sincronització d'Email des de auth.users
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users 
    SET email = NEW.email 
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nota: Aquest trigger s'ha d'aplicar a la taula auth.users (esquema auth)
-- En una migració de Supabase, podem fer-ho així:
CREATE TRIGGER tr_auth_user_email_sync
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION sync_user_email();

-- 3. AUTOMATITZACIÓ DE CENTRES

-- 3.1 Creació de Playlists per Defecte
CREATE OR REPLACE FUNCTION create_default_playlists_for_center()
RETURNS TRIGGER AS $$
BEGIN
    -- Llistes de dies de la setmana
    INSERT INTO playlists (center_id, name, kind, is_deletable)
    VALUES 
        (NEW.id, 'Dilluns', 'weekday', false),
        (NEW.id, 'Dimarts', 'weekday', false),
        (NEW.id, 'Dimecres', 'weekday', false),
        (NEW.id, 'Dijous', 'weekday', false),
        (NEW.id, 'Divendres', 'weekday', false),
        (NEW.id, 'Dissabte', 'weekday', false),
        (NEW.id, 'Diumenge', 'weekday', false),
        (NEW.id, 'Anuncis', 'announcements', false);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_center_default_playlists
AFTER INSERT ON centers
FOR EACH ROW EXECUTE FUNCTION create_default_playlists_for_center();

-- 4. SISTEMA DE MODERACIÓ & NOTIFICACIONS

-- 4.1 Taula de Notificacions (Mínima)
CREATE TABLE notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'video_pending', 'video_approved', 'video_rejected'
    title text NOT NULL,
    message text NOT NULL,
    video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT TO authenticated 
USING (user_id = auth.uid());

-- 4.2 Trigger de Notificació de Vídeo Pendent
CREATE OR REPLACE FUNCTION notify_pending_video()
RETURNS TRIGGER AS $$
DECLARE
    editor_record RECORD;
BEGIN
    IF NEW.status = 'pending_approval' THEN
        FOR editor_record IN 
            SELECT id FROM users 
            WHERE center_id = NEW.center_id AND role = 'editor_profe' AND is_active = true
        LOOP
            INSERT INTO notifications (user_id, type, title, message, video_id)
            VALUES (
                editor_record.id, 
                'video_pending', 
                'Nou vídeo pendent', 
                'Hi ha un nou vídeo que requereix la teva aprovació.', 
                NEW.id
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_video_pending_notification
AFTER INSERT ON videos
FOR EACH ROW EXECUTE FUNCTION notify_pending_video();
