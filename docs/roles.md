# Rols i permisos - PUBLI*CAT

Font funcional dels rols. Per detalls de BD consulta `docs/database.schema.md`; per regles operatives consulta `AGENTS.md`.

## Principis

- El rol i centre autoritzadors provenen de `public.users`.
- `user_metadata` no s'ha d'usar per autoritzar.
- Les restriccions han d'existir a UI, API i RLS.
- `center_id` limita l'abast de tots els rols excepte `admin_global`.

## `admin_global`

Objectiu: administracio global del sistema.

Pot:

- Gestionar centres, zones i usuaris globals.
- Veure i gestionar contingut de qualsevol centre.
- Gestionar llistes globals i la landing publica.
- Crear contingut propi, normalment associat al Centre Lacenet per defecte.
- Configurar o supervisar RSS, display i dades compartides.

Restriccions:

- Ha d'operar amb el compte GitHub/Supabase correcte quan es facin canvis externs.
- Encara que tingui abast global, les accions sensibles han de passar per API/RLS.

## `editor_profe`

Objectiu: gestio editorial d'un centre.

Pot:

- Crear i editar videos del seu centre.
- Aprovar videos pendents d'alumnes.
- Demanar revisio (`needs_revision`) amb comentari.
- Gestionar llistes, items, calendari, RSS, ticker i configuracio de pantalla del seu centre.
- Substituir el logo del seu propi centre des de la configuracio de pantalla.
- Gestionar usuaris del seu centre dins els rols permesos.

Restriccions:

- No pot operar sobre altres centres.
- No pot modificar el logo d'un altre centre.
- No pot convertir usuaris en `admin_global`.
- No ha de poder crear ni modificar llistes globals de sistema.

## `editor_alumne`

Objectiu: pujar i corregir contingut amb supervisio.

Pot:

- Crear videos propis, que entren com `pending_approval`.
- Veure videos publicats disponibles segons permisos.
- Veure els seus videos `pending_approval` o `needs_revision`.
- Corregir els seus videos en `needs_revision` i reenviar-los a revisio.
- Editar items de playlists marcades com editables per alumnes quan el flux ho permeti.

Restriccions:

- No pot publicar directament.
- No pot aprovar, compartir ni eliminar videos d'altres usuaris.
- No pot editar videos propis ja publicats pel flux normal.
- No pot gestionar metadades de playlists.

Pendent:

- Tancar la regla definitiva de `is_student_editable` per playlists `weekday` i `announcements`.

## `display`

Objectiu: mode passiu de pantalla.

Pot:

- Accedir al mode pantalla/display.
- Llegir la configuracio i contingut necessari per reproduir la pantalla del seu centre.

Restriccions:

- No pot crear, editar ni eliminar contingut.
- No pot gestionar usuaris, RSS, llistes ni configuracio.

## Convidats temporals

Les taules de guest access existeixen, pero `guest_access_links` esta tancada per RLS sense policies visibles a data 2026-07-09. Tracta el rol convidat com a funcionalitat pendent fins que hi hagi API/UI/policies actives.
