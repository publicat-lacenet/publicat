-- Milestone 1.6: Seeds & Dades Demo
-- Descripció: Càrrega de dades inicials per a desenvolupament.

-- 1. ZONES GLOBALS
INSERT INTO zones (name)
VALUES 
    ('Bages'),
    ('Terrassa'),
    ('Moianés'),
    ('Anoia'),
    ('Barcelona')
ON CONFLICT (name) DO NOTHING;

-- 2. TAGS GLOBALS
INSERT INTO tags (name)
VALUES 
    ('World'),
    ('Espanya'),
    ('Catalunya'),
    ('Esports'),
    ('Meteorologia'),
    ('STEM-TECH'),
    ('Efemèrides'),
    ('Dites i refranys'),
    ('Curiositats'),
    ('Música'),
    ('Arts'),
    ('Vida al centre')
ON CONFLICT (name) DO NOTHING;

-- 3. CENTRE DEMO
DO $$
DECLARE
    cat_zone_id uuid;
BEGIN
    SELECT id INTO cat_zone_id FROM zones WHERE name = 'Bages';
    
    IF cat_zone_id IS NOT NULL THEN
        INSERT INTO centers (name, zone_id)
        VALUES ('Institut Demo', cat_zone_id)
        ON CONFLICT (name) DO NOTHING;
    END IF;
END $$;

-- 4. USUARIS CREATS
-- Els següents perfils d'usuari s'han creat a public.users enllaçats amb auth.users:
-- 
-- Admin Global:
--   - shorrill@xtec.cat (Sergio Horrill - Admin)
--   - ttubio@gmail.com (Toni Tubio - Admin)
--
-- Editor Professor:
--   - shorrillo@gmail.com (Sergio Horrill - Editor) → Institut Demo LaceNet
