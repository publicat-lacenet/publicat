-- Migració: Permetre admin_global amb centre i associar-los a LaceNet
-- Data: 2025-01-07
-- Objectiu: Resoldre problema d'admins globals sense centre

-- 1. Modificar constraint per permetre admin_global amb center_id
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_user_center_role;

ALTER TABLE users ADD CONSTRAINT chk_user_center_role CHECK (
    -- admin_global pot tenir o no tenir centre
    (role = 'admin_global') OR 
    -- Altres rols OBLIGATÒRIAMENT han de tenir centre
    (role <> 'admin_global' AND center_id IS NOT NULL)
);

-- 2. Associar tots els admin_global existents sense centre al centre LaceNet
DO $$
DECLARE
    lacenet_center_id uuid;
BEGIN
    -- Obtenir l'ID del centre LaceNet existent (el nom pot ser LaceNet o Lacenet)
    SELECT id INTO lacenet_center_id 
    FROM centers 
    WHERE LOWER(name) = 'lacenet' 
    LIMIT 1;
    
    IF lacenet_center_id IS NOT NULL THEN
        -- Associar tots els admin_global existents sense centre al centre LaceNet
        UPDATE users 
        SET center_id = lacenet_center_id,
            updated_at = now()
        WHERE role = 'admin_global' 
        AND center_id IS NULL;
        
        RAISE NOTICE 'Admins globals associats al centre LaceNet (ID: %)', lacenet_center_id;
    ELSE
        RAISE WARNING 'No s''ha trobat el centre LaceNet. Si us plau, crea''l primer.';
    END IF;
END $$;

-- 3. Trigger per assignar automàticament LaceNet als nous admin_global
CREATE OR REPLACE FUNCTION assign_lacenet_to_admin_global()
RETURNS TRIGGER AS $$
DECLARE
    lacenet_center_id uuid;
BEGIN
    -- Només actuar si és admin_global i no té centre assignat
    IF NEW.role = 'admin_global' AND NEW.center_id IS NULL THEN
        -- Buscar el centre LaceNet
        SELECT id INTO lacenet_center_id 
        FROM centers 
        WHERE LOWER(name) = 'lacenet' 
        LIMIT 1;
        
        -- Si existeix, assignar-lo
        IF lacenet_center_id IS NOT NULL THEN
            NEW.center_id := lacenet_center_id;
            RAISE NOTICE 'Centre LaceNet assignat automàticament a admin_global (user_id: %)', NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar el trigger abans d'inserir
DROP TRIGGER IF EXISTS tr_assign_lacenet_to_admin ON users;
CREATE TRIGGER tr_assign_lacenet_to_admin
BEFORE INSERT ON users
FOR EACH ROW EXECUTE FUNCTION assign_lacenet_to_admin_global();
