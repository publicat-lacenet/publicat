-- Milestone 1.7: Extensions Futures
-- Descripció: Taules per a RSS, Calendari, Convidats i Auditoria.

-- 1. SISTEMA RSS

-- 1.1 rss_feeds
CREATE TABLE rss_feeds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id uuid REFERENCES centers(id) ON DELETE CASCADE, -- NULL per a feeds globals
    name text NOT NULL,
    url text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    last_fetched_at timestamptz,
    last_error text,
    created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rss_feeds_center_id ON rss_feeds(center_id);
ALTER TABLE rss_feeds ENABLE ROW LEVEL SECURITY;

-- 1.2 rss_items (Caché)
CREATE TABLE rss_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_id uuid NOT NULL REFERENCES rss_feeds(id) ON DELETE CASCADE,
    guid text NOT NULL,
    title text NOT NULL,
    description text,
    link text NOT NULL,
    pub_date timestamptz,
    image_url text,
    fetched_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (feed_id, guid)
);

ALTER TABLE rss_items ENABLE ROW LEVEL SECURITY;

-- 1.3 rss_center_settings & rss_rotation_order
CREATE TABLE rss_center_settings (
    center_id uuid PRIMARY KEY REFERENCES centers(id) ON DELETE CASCADE,
    seconds_per_item int NOT NULL DEFAULT 15,
    seconds_per_feed int NOT NULL DEFAULT 120,
    refresh_minutes int NOT NULL DEFAULT 60,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rss_center_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE rss_rotation_order (
    center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    feed_id uuid NOT NULL REFERENCES rss_feeds(id) ON DELETE CASCADE,
    position int NOT NULL,
    PRIMARY KEY (center_id, feed_id),
    UNIQUE (center_id, position)
);

ALTER TABLE rss_rotation_order ENABLE ROW LEVEL SECURITY;

-- 2. CALENDARI & PLANIFICACIÓ

-- 2.1 schedule_overrides
CREATE TABLE schedule_overrides (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    date date NOT NULL,
    playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE RESTRICT,
    created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (center_id, date)
);

CREATE INDEX idx_schedule_overrides_center_date ON schedule_overrides(center_id, date);
ALTER TABLE schedule_overrides ENABLE ROW LEVEL SECURITY;

-- 3. CONVIDATS & AUDITORIA

-- 3.1 guest_access_links
CREATE TABLE guest_access_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token text NOT NULL UNIQUE,
    center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz
);

ALTER TABLE guest_access_links ENABLE ROW LEVEL SECURITY;

-- 3.2 audit_logs
CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    details jsonb,
    ip_address text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. TRIGGERS DE UPDATED_AT PER A EXTENSIONS
CREATE TRIGGER tr_rss_feeds_updated_at BEFORE UPDATE ON rss_feeds FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_rss_center_settings_updated_at BEFORE UPDATE ON rss_center_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
