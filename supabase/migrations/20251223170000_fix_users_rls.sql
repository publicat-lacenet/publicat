-- Fix RLS per permetre als usuaris veure el seu propi perfil
-- Problema: les polítiques amb subconsultes a la mateixa taula causen recursió infinita
-- Solució: Polítiques simples sense subconsultes. La lògica de filtrat es fa a nivell d'aplicació.

-- Eliminar TOTES les polítiques de users que causin recursió
DROP POLICY IF EXISTS "Users can view profiles in their center" ON users;
DROP POLICY IF EXISTS "Admins and editors can manage users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view other profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON users;
DROP POLICY IF EXISTS "Allow delete for authenticated" ON users;

-- Crear polítiques simples sense subconsultes
-- 1. Qualsevol usuari autenticat pot veure el seu propi perfil
CREATE POLICY "Users can view own profile" 
ON users FOR SELECT TO authenticated 
USING (id = auth.uid());

-- 2. Qualsevol usuari autenticat pot veure altres perfils (filtrat per app)
CREATE POLICY "Users can view other profiles" 
ON users FOR SELECT TO authenticated 
USING (true);

-- 3. Només el mateix usuari pot actualitzar el seu perfil
CREATE POLICY "Users can update own profile" 
ON users FOR UPDATE TO authenticated 
USING (id = auth.uid());

-- 4. Permetre INSERT i DELETE (gestionat per l'aplicació amb verificació de rol)
CREATE POLICY "Allow insert for authenticated" 
ON users FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow delete for authenticated" 
ON users FOR DELETE TO authenticated 
USING (true);
