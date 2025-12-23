-- Milestone 1.3: Contingut & Classificació
-- Descripció: Taules d'etiquetes, relacions N-M i funcionalitats de compartició.

-- 1. TAULES DE CLASSIFICACIÓ

-- 1.1 tags (Globals)
CREATE TABLE tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags are viewable by all" 
ON tags FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Tags are manageable by admin_global" 
ON tags FOR ALL TO authenticated 
USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

-- 1.2 hashtags (Per Centre)
CREATE TABLE hashtags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (center_id, name)
);

ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hashtags are viewable by center" 
ON hashtags FOR SELECT TO authenticated 
USING (
    center_id = (SELECT center_id FROM users WHERE id = auth.uid()) OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

CREATE POLICY "Hashtags are manageable by center editors" 
ON hashtags FOR ALL TO authenticated 
USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin_global', 'editor_profe') AND 
    center_id = (SELECT center_id FROM users WHERE id = auth.uid())
);

-- 2. RELACIONS N-M

-- 2.1 video_tags
CREATE TABLE video_tags (
    video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
    PRIMARY KEY (video_id, tag_id)
);

CREATE INDEX idx_video_tags_tag_id ON video_tags(tag_id);

ALTER TABLE video_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Video tags are viewable by anyone who can see the video"
ON video_tags FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM videos 
        WHERE id = video_tags.video_id
    )
);

CREATE POLICY "Video tags are manageable by anyone who can manage the video"
ON video_tags FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM videos 
        WHERE id = video_tags.video_id
    )
);

-- 2.2 video_hashtags
CREATE TABLE video_hashtags (
    video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    hashtag_id uuid NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    PRIMARY KEY (video_id, hashtag_id)
);

CREATE INDEX idx_video_hashtags_hashtag_id ON video_hashtags(hashtag_id);

ALTER TABLE video_hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Video hashtags are viewable by anyone who can see the video"
ON video_hashtags FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM videos 
        WHERE id = video_hashtags.video_id
    )
);

CREATE POLICY "Video hashtags are manageable by anyone who can manage the video"
ON video_hashtags FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM videos 
        WHERE id = video_hashtags.video_id
    )
);

-- 3. ACTUALITZACIÓ DE 'videos' (Compartició)

ALTER TABLE videos 
ADD COLUMN zone_id uuid REFERENCES zones(id) ON DELETE RESTRICT,
ADD COLUMN approved_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN approved_at timestamptz,
ADD COLUMN is_shared_with_other_centers boolean NOT NULL DEFAULT false,
ADD COLUMN shared_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN shared_at timestamptz;

CREATE INDEX idx_videos_zone_id ON videos(zone_id);
CREATE INDEX idx_videos_shared ON videos(is_shared_with_other_centers) WHERE is_shared_with_other_centers = true;

-- 3.1 Actualització de RLS per a 'videos' (Lectura Compartida)
DROP POLICY "Videos are viewable by center or if shared" ON videos;

CREATE POLICY "Videos are viewable by center or if shared" 
ON videos FOR SELECT TO authenticated 
USING (
    center_id = (SELECT center_id FROM users WHERE id = auth.uid()) OR 
    is_shared_with_other_centers = true OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);
