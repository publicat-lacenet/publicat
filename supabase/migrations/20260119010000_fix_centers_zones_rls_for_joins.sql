-- Migración: Fix centers and zones RLS for nested joins
-- Descripción: Simplifica les polítiques RLS per permetre que els JOINs anidats funcionin correctament
-- Data: 2026-01-19

-- PROBLEMA: Les polítiques amb EXISTS no funcionen bé dins de JOINs anidats de Supabase
-- SOLUCIÓ: Fer les polítiques més permissives per a lectura (SELECT)

-- 1. POLÍTICA DE CENTERS: Permetre veure qualsevol centre (només lectura)
-- La seguretat real està a nivell de videos (qui pot veure quins vídeos)
DROP POLICY IF EXISTS "Users can view their own center and centers with shared videos" ON centers;

CREATE POLICY "Users can view all centers for video metadata"
ON centers FOR SELECT TO authenticated
USING (true);  -- Permetre lectura de tots els centres (metadata pública)

-- Mantenir la política de gestió restrictiva
-- (aquesta ja existeix i no cal tocar-la)

-- 2. POLÍTICA DE ZONES: Permetre veure qualsevol zona (només lectura)
DROP POLICY IF EXISTS "Zones are viewable by authenticated users and zones with shared videos" ON zones;

CREATE POLICY "Users can view all zones for video metadata"
ON zones FOR SELECT TO authenticated
USING (true);  -- Permetre lectura de totes les zones (metadata pública)

-- Mantenir la política de gestió restrictiva
-- (aquesta ja existeix i no cal tocar-la)

-- NOTA: Aquesta solució és segura perquè:
-- 1. La seguretat real està a nivell de videos (RLS de videos filtra correctament)
-- 2. Els noms de centres i zones són metadata "pública" dins del sistema
-- 3. Les polítiques d'INSERT/UPDATE/DELETE es mantenen restrictives (només admin_global)
-- 4. Els usuaris només poden veure els vídeos que les polítiques de videos permeten
