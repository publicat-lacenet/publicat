-- Neteja: Eliminar camp has_completed_onboarding si existeix
-- Data: 2026-01-12
-- Motiu: Aquest camp no es va crear mai però la migració 20251224000000_fix_onboarding_status.sql
--        intentava actualitzar-lo. El camp onboarding_status (enum) és suficient.

-- Eliminar el camp si existeix (no farà res si no existeix)
ALTER TABLE users DROP COLUMN IF EXISTS has_completed_onboarding;

-- Comentari per documentar la decisió
COMMENT ON COLUMN users.onboarding_status IS 'Estat d''onboarding: invited (convidat), active (actiu), disabled (desactivat)';
