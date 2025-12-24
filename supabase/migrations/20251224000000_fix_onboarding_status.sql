-- Actualitzar usuaris que ja han fet login perquè tinguin onboarding completat
-- Això només afecta usuaris amb last_sign_in_at no nul (han fet login)

UPDATE users 
SET has_completed_onboarding = true 
WHERE has_completed_onboarding = false 
  AND id IN (
    SELECT id 
    FROM auth.users 
    WHERE last_sign_in_at IS NOT NULL
  );
