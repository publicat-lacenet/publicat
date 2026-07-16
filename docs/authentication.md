# Autenticacio i usuaris - PUBLI*CAT

Document curt i canonic del model d'autenticacio. La font d'autoritzacio aplicativa es `public.users`.

## Model

- Supabase Auth gestiona identitat, sessio, invitacions i recuperacio de contrasenya.
- `public.users` guarda el perfil d'app: `id`, `email`, `role`, `center_id`, `onboarding_status`, `is_active`, dades personals i traçabilitat.
- `public.users.id` correspon a `auth.users.id`.
- El trigger `sync_user_email` manté sincronitzat l'email quan cal.
- Els usuaris `admin_global` poden rebre centre per defecte via trigger (`assign_lacenet_to_admin_global`).

## Regla d'Autoritzacio

- Autoritza sempre amb `public.users`.
- No autoritzis amb `user_metadata`.
- `app_metadata` nomes pot ser cache auxiliar si es decideix explicitament; no substitueix comprovacions server-side sensibles.
- Les API routes han de fer `supabase.auth.getUser()` i despres llegir el perfil a `public.users`.
- Si no hi ha perfil actiu o el perfil no te rol/centre coherent, retorna error i no facis fallback autoritzador.

## Fluxos

### Login

1. L'usuari inicia sessio amb Supabase Auth.
2. `/api/auth/me` hidrata el perfil amb `public.users`.
3. El client pot mostrar UI segons rol, pero les accions sensibles es tornen a validar al servidor.

### Invitacio

1. `admin_global` o `editor_profe` crea/invita l'usuari segons el seu abast.
2. Es crea o sincronitza el registre a `public.users`.
3. L'usuari queda `invited` fins completar activacio.
4. En confirmar, passa a `active`.

### Recuperacio de contrasenya

- Supabase Auth gestiona el correu i el callback.
- La recuperacio no ha de canviar rol ni centre.

### Display

- El rol `display` usa sessio autenticada per accedir al mode pantalla.
- Ha de quedar sense capacitats d'edicio a UI, API i RLS.

## Estat Actual i Deute

Verificat en revisio de docs/codi:

- Encara hi ha fallbacks a `user_metadata` en diverses API routes, `proxy.ts` i `AuthContext`.
- Aquest comportament es considera deute de seguretat/consistencia i s'ha de retirar progressivament.
- Fins que s'elimini, la documentacio ha de deixar clar que `user_metadata` no es font canonica.

## Checklist per Canvis d'Auth

- Comprovar `public.users` com a font de rol i centre.
- Evitar secrets en client.
- Validar `is_active` i `onboarding_status` quan l'accio ho requereixi.
- Mantenir errors d'usuari en catala.
- Actualitzar `MEMORIA_PROJECTE.md` si es canvia una regla d'autoritzacio.
