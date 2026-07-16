# Milestone 1.3: Contingut & Classificació

Aquest document completa l'estructura de catalogació de vídeos, afegint el sistema d'etiquetes globals (tags) i personalitzades (hashtags), així com les funcionalitats de compartició intercentres.

---

## 1. Taules de Classificació

### 1.1 `tags` (Globals)
Etiquetes predefinides gestionades per l'administrador global.

```sql
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: Lectura pública (autenticats), escriptura admin_global
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tags are viewable by all" ON tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tags are manageable by admin_global" ON tags FOR ALL TO authenticated 
USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin_global');
```

### 1.2 `hashtags` (Per Centre)
Etiquetes creades pels centres per a ús intern.

```sql
CREATE TABLE hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (center_id, name)
);

-- RLS: Aïllament per centre
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hashtags are viewable by center" ON hashtags FOR SELECT TO authenticated 
USING (center_id = (SELECT center_id FROM users WHERE id = auth.uid()) OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global');
CREATE POLICY "Hashtags are manageable by center editors" ON hashtags FOR ALL TO authenticated 
USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin_global', 'editor_profe') AND center_id = (SELECT center_id FROM users WHERE id = auth.uid()));
```

---

## 2. Relacions N-M

### 2.1 `video_tags`
```sql
CREATE TABLE video_tags (
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
  PRIMARY KEY (video_id, tag_id)
);

CREATE INDEX idx_video_tags_tag_id ON video_tags(tag_id);
```

### 2.2 `video_hashtags`
```sql
CREATE TABLE video_hashtags (
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, hashtag_id)
);

CREATE INDEX idx_video_hashtags_hashtag_id ON video_hashtags(hashtag_id);
```

---

## 3. Actualització de `videos` (Compartició)

Afegim els camps necessaris per a la compartició intercentres i la traçabilitat de l'aprovació.

```sql
ALTER TABLE videos 
ADD COLUMN zone_id uuid REFERENCES zones(id) ON DELETE RESTRICT,
ADD COLUMN approved_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN approved_at timestamptz,
ADD COLUMN is_shared_with_other_centers boolean NOT NULL DEFAULT false,
ADD COLUMN shared_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN shared_at timestamptz;

CREATE INDEX idx_videos_zone_id ON videos(zone_id);
CREATE INDEX idx_videos_shared ON videos(is_shared_with_other_centers) WHERE is_shared_with_other_centers = true;
```

### 3.1 Actualització de RLS per a `videos` (Lectura Compartida)
Hem de permetre que els usuaris vegin vídeos d'altres centres si estan marcats com a compartits.

```sql
DROP POLICY "Videos are viewable by center or if shared" ON videos;

CREATE POLICY "Videos are viewable by center or if shared" 
ON videos FOR SELECT TO authenticated 
USING (
  center_id = (SELECT center_id FROM users WHERE id = auth.uid()) OR 
  is_shared_with_other_centers = true OR
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);
```

---

## 4. Checklist de Validació
- [ ] Taules `tags` i `hashtags` creades amb RLS.
- [ ] Relacions N-M `video_tags` i `video_hashtags` funcionals.
- [ ] Taula `videos` actualitzada amb camps de compartició.
- [ ] RLS de `videos` permet veure contingut compartit d'altres centres.
- [ ] Índexs creats per optimitzar filtres per tag i compartició.

---

## 5. Pròxims Passos
- Definir l'estructura de llistes a `M1-4-playlists-schema.md`.
- Implementar el trigger de sincronització de `zone_id` a `M1-5-triggers-core.md`.
