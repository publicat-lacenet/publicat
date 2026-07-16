# Milestone 1.4: Playlists (Estructura)

Aquest document defineix l'estructura de dades per a les llistes de reproducció, permetent l'organització seqüencial de vídeos per a la seva reproducció a la pantalla principal.

---

## 1. Enums de Llistes

```sql
CREATE TYPE playlist_kind AS ENUM (
  'weekday',        -- Dilluns a Diumenge
  'announcements',  -- Llista especial d'anuncis
  'custom',         -- Llistes personalitzades del centre
  'global',         -- Llistes creades per admin_global
  'landing'         -- Llista per a la landing page pública
);
```

---

## 2. Taules de Playlists

### 2.1 `playlists`
```sql
CREATE TABLE playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid REFERENCES centers(id) ON DELETE CASCADE, -- NULL per a llistes globals/landing
  name text NOT NULL,
  kind playlist_kind NOT NULL,
  is_deletable boolean NOT NULL DEFAULT true,
  is_student_editable boolean NOT NULL DEFAULT false,
  origin_playlist_id uuid REFERENCES playlists(id) ON DELETE SET NULL, -- Per a còpies de llistes globals
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints de negoci
  CONSTRAINT chk_playlist_center_kind CHECK (
    (kind IN ('weekday', 'announcements', 'custom') AND center_id IS NOT NULL) OR
    (kind IN ('global', 'landing') AND center_id IS NULL) OR
    (kind = 'global' AND center_id IS NOT NULL AND origin_playlist_id IS NOT NULL) -- Còpia local de global
  )
);

CREATE INDEX idx_playlists_center_kind ON playlists(center_id, kind);
```

### 2.2 `playlist_items`
Relació ordenada entre llistes i vídeos.

```sql
CREATE TABLE playlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  position int NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  added_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  
  UNIQUE (playlist_id, position)
);

CREATE INDEX idx_playlist_items_playlist_id ON playlist_items(playlist_id);
```

---

## 3. Seguretat (RLS)

```sql
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;

-- Polítiques per a playlists
CREATE POLICY "Playlists are viewable by center or if global" 
ON playlists FOR SELECT TO authenticated 
USING (
  center_id = (SELECT center_id FROM users WHERE id = auth.uid()) OR 
  center_id IS NULL OR
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

CREATE POLICY "Editors can manage playlists in their center" 
ON playlists FOR ALL TO authenticated 
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global' OR 
  ((SELECT role FROM users WHERE id = auth.uid()) = 'editor_profe' AND (center_id = (SELECT center_id FROM users WHERE id = auth.uid()) OR center_id IS NULL))
);

-- Polítiques per a playlist_items (hereten de la playlist)
CREATE POLICY "Playlist items are viewable by playlist access" 
ON playlist_items FOR SELECT TO authenticated 
USING (
  EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id)
);

CREATE POLICY "Playlist items are manageable by playlist access" 
ON playlist_items FOR ALL TO authenticated 
USING (
  EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global' OR
    ((SELECT role FROM users WHERE id = auth.uid()) = 'editor_profe' AND center_id = (SELECT center_id FROM users WHERE id = auth.uid()))
  ))
);
```

---

## 4. Checklist de Validació
- [ ] Enum `playlist_kind` definit.
- [ ] Taula `playlists` amb constraint de coherència `center_id`/`kind`.
- [ ] Taula `playlist_items` amb constraint UNIQUE en `position`.
- [ ] RLS permet lectura de llistes globals a tots els centres.
- [ ] RLS impedeix que un centre modifiqui llistes d'un altre.
- [ ] Índexs creats per a consultes de reproducció.

---

## 5. Pròxims Passos
- Implementar automatismes (triggers) a `M1-5-triggers-core.md`.
- Crear dades de prova a `M1-6-seeds.md`.
