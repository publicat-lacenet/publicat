-- Milestone 5: Sistema RSS Complet
-- Descripció: Afegir columnes mancants i polítiques RLS per a taules RSS

-- ============================================================================
-- 1. AFEGIR COLUMNES MANCANTS A rss_feeds
-- ============================================================================

-- Columna per indicar si el feed està a la rotació de pantalla
ALTER TABLE rss_feeds ADD COLUMN IF NOT EXISTS is_in_rotation boolean NOT NULL DEFAULT true;

-- Comptador d'errors consecutius (per desactivar automàticament)
ALTER TABLE rss_feeds ADD COLUMN IF NOT EXISTS error_count int NOT NULL DEFAULT 0;

-- ============================================================================
-- 2. ÍNDEXS ADDICIONALS
-- ============================================================================

-- Índex per cercar ítems per feed (millorar consultes de display)
CREATE INDEX IF NOT EXISTS idx_rss_items_feed_id ON rss_items(feed_id);

-- Índex per ordenar ítems per data de publicació
CREATE INDEX IF NOT EXISTS idx_rss_items_pub_date ON rss_items(pub_date DESC);

-- Índex parcial per feeds actius (optimitzar consultes de cron)
CREATE INDEX IF NOT EXISTS idx_rss_feeds_active ON rss_feeds(center_id, is_active)
WHERE is_active = true AND error_count < 5;

-- ============================================================================
-- 3. POLÍTIQUES RLS PER A rss_feeds
-- ============================================================================

-- SELECT: Usuaris veuen feeds del seu centre + feeds globals + admin_global veu tots
CREATE POLICY "Users can view own center feeds"
ON rss_feeds FOR SELECT
TO authenticated
USING (
  center_id = (SELECT center_id FROM users WHERE id = auth.uid())
  OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
  OR center_id IS NULL  -- Feeds globals
);

-- INSERT: editor_profe i admin_global poden crear feeds
CREATE POLICY "Editors can create feeds"
ON rss_feeds FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('editor_profe', 'admin_global')
  AND (
    center_id = (SELECT center_id FROM users WHERE id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
  )
);

-- UPDATE: editor_profe del seu centre + admin_global
CREATE POLICY "Editors can update feeds"
ON rss_feeds FOR UPDATE
TO authenticated
USING (
  (
    (SELECT role FROM users WHERE id = auth.uid()) = 'editor_profe'
    AND center_id = (SELECT center_id FROM users WHERE id = auth.uid())
  )
  OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

-- DELETE: editor_profe del seu centre + admin_global
CREATE POLICY "Editors can delete feeds"
ON rss_feeds FOR DELETE
TO authenticated
USING (
  (
    (SELECT role FROM users WHERE id = auth.uid()) = 'editor_profe'
    AND center_id = (SELECT center_id FROM users WHERE id = auth.uid())
  )
  OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

-- ============================================================================
-- 4. POLÍTIQUES RLS PER A rss_items
-- ============================================================================

-- SELECT: Hereta permisos del feed pare
CREATE POLICY "Users can view feed items"
ON rss_items FOR SELECT
TO authenticated
USING (
  feed_id IN (
    SELECT id FROM rss_feeds
    WHERE center_id = (SELECT center_id FROM users WHERE id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
    OR center_id IS NULL
  )
);

-- Els ítems són gestionats per cron job amb service_role
-- No hi ha polítiques INSERT/UPDATE/DELETE per usuaris normals

-- ============================================================================
-- 5. POLÍTIQUES RLS PER A rss_center_settings
-- ============================================================================

-- SELECT: Usuaris veuen settings del seu centre + admin_global veu tots
CREATE POLICY "Users can view own center settings"
ON rss_center_settings FOR SELECT
TO authenticated
USING (
  center_id = (SELECT center_id FROM users WHERE id = auth.uid())
  OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

-- INSERT: Crear settings pel propi centre (editors i admin)
CREATE POLICY "Editors can create center settings"
ON rss_center_settings FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('editor_profe', 'admin_global')
  AND (
    center_id = (SELECT center_id FROM users WHERE id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
  )
);

-- UPDATE: Modificar settings del propi centre
CREATE POLICY "Editors can update center settings"
ON rss_center_settings FOR UPDATE
TO authenticated
USING (
  (
    (SELECT role FROM users WHERE id = auth.uid()) = 'editor_profe'
    AND center_id = (SELECT center_id FROM users WHERE id = auth.uid())
  )
  OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

-- ============================================================================
-- 6. POLÍTIQUES RLS PER A rss_rotation_order
-- ============================================================================

-- SELECT: Usuaris veuen rotació del seu centre + admin_global veu tots
CREATE POLICY "Users can view own center rotation"
ON rss_rotation_order FOR SELECT
TO authenticated
USING (
  center_id = (SELECT center_id FROM users WHERE id = auth.uid())
  OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

-- INSERT/UPDATE/DELETE: Editors poden gestionar rotació del seu centre
CREATE POLICY "Editors can manage center rotation"
ON rss_rotation_order FOR ALL
TO authenticated
USING (
  (
    (SELECT role FROM users WHERE id = auth.uid()) = 'editor_profe'
    AND center_id = (SELECT center_id FROM users WHERE id = auth.uid())
  )
  OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
)
WITH CHECK (
  (
    (SELECT role FROM users WHERE id = auth.uid()) = 'editor_profe'
    AND center_id = (SELECT center_id FROM users WHERE id = auth.uid())
  )
  OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

-- ============================================================================
-- 7. COMENTARIS
-- ============================================================================

COMMENT ON COLUMN rss_feeds.is_in_rotation IS 'Si el feed s''inclou a la rotació de pantalla';
COMMENT ON COLUMN rss_feeds.error_count IS 'Comptador d''errors consecutius. Si >= 5, el feed es desactiva automàticament';

COMMENT ON TABLE rss_items IS 'Caché d''ítems RSS. Els ítems són gestionats pel cron job amb service_role';
COMMENT ON TABLE rss_center_settings IS 'Configuració RSS específica per centre (temps per ítem, interval, etc.)';
COMMENT ON TABLE rss_rotation_order IS 'Ordre de rotació dels feeds per centre';
