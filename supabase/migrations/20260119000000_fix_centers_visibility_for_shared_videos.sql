-- Migración: Fix centers visibility for shared videos
-- Descripción: Permite que los usuarios vegin la información dels centres que tenen vídeos compartits amb ells
-- Data: 2026-01-19

-- PASO 1: Crear índice compuesto para optimizar las políticas RLS
-- Aquest índex accelera les consultes EXISTS que busquen vídeos compartits per centre
CREATE INDEX IF NOT EXISTS idx_videos_center_shared_active
ON videos(center_id, is_shared_with_other_centers, is_active)
WHERE is_shared_with_other_centers = true AND is_active = true;

-- PASO 2: Eliminar la política antiga
DROP POLICY IF EXISTS "Users can view their own center" ON centers;

-- Crear nova política que permet veure:
-- 1. El teu propi centre
-- 2. Centres que tenen vídeos compartits amb altres centres
-- 3. Tots els centres si ets admin_global
CREATE POLICY "Users can view their own center and centers with shared videos"
ON centers FOR SELECT TO authenticated
USING (
    -- El teu propi centre
    id = (SELECT center_id FROM users WHERE id = auth.uid())
    OR
    -- Centres que tenen vídeos compartits
    EXISTS (
        SELECT 1 FROM videos
        WHERE videos.center_id = centers.id
        AND videos.is_shared_with_other_centers = true
        AND videos.is_active = true
    )
    OR
    -- Admin global veu tot
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

-- La política per a zones també ha de permetre veure zones de centres amb vídeos compartits
DROP POLICY IF EXISTS "Zones are viewable by authenticated users" ON zones;

CREATE POLICY "Zones are viewable by authenticated users and zones with shared videos"
ON zones FOR SELECT TO authenticated
USING (
    -- Zones actives
    (is_active = true)
    OR
    -- Zones que tenen centres amb vídeos compartits
    EXISTS (
        SELECT 1 FROM centers
        JOIN videos ON videos.center_id = centers.id
        WHERE centers.zone_id = zones.id
        AND videos.is_shared_with_other_centers = true
        AND videos.is_active = true
    )
    OR
    -- Admin global veu tot
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);
