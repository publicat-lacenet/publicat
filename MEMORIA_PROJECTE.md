# Memoria operativa del projecte PUBLI*CAT

Aquest fitxer registra fets verificats, decisions i rectificacions importants per evitar dubtes recurrents entre sessions. No substitueix `AGENTS.md`, que continua sent la guia canonica d'operacio del repo.

## Estat verificat - 2026-07-09

- Repo local: `D:\Drive shorrill\app-videos-lacenet`.
- Projecte Supabase linkat: `tvsafusrasfzubiujavk` (`publicat_videos`), comprovat a `supabase/.temp/project-ref`.
- Connexio BD real usada per verificacio: `DATABASE_URL` de `.env.local`, sense imprimir secrets.
- Consulta de control: `current_database() = postgres`, `current_user = postgres`, `server_time = 2026-07-09T06:00:47.294Z`.

### Migracions Supabase

Rectificacio important: les migracions estan al dia a data 2026-07-09.

- Migracions locals a `supabase/migrations/`: 35.
- Versions registrades a `supabase_migrations.schema_migrations`: 35.
- Diferencies detectades:
  - locals no registrades: cap.
  - registrades sense fitxer local: cap.
- La versio `20260707180000_harden_core_rls_policies.sql` consta registrada a la BD real.

Nota: el `PROJECT_REVIEW_ROADMAP.md` conte anotacions del 2026-07-07 que deien que algunes migracions no constaven a `schema_migrations`. Aquella observacio pot haver estat certa en aquell moment, pero ja no descriu l'estat real verificat el 2026-07-09.

### Jerarquia documental

Decisio aplicada el 2026-07-09:

- `AGENTS.md` queda com a guia operativa canonica.
- `README.md` queda com a porta d'entrada humana: estat, posada en marxa, estructura del repo i mapa resum de BD.
- `MEMORIA_PROJECTE.md` queda com a registre datat de verificacions, rectificacions i decisions.
- `docs/database.schema.md` queda com a mapa canonic d'estructura i relacions de BD; el SQL exacte continua a `supabase/migrations/`.
- `PROJECT_REVIEW_ROADMAP.md` queda com a registre d'auditoria/revisio, no com a font canonica permanent.
- La documentacio historica/desfasable s'ha mogut a `docs/OBSOLET/`.
- `docs/storage.md` queda com a resum curt de l'estat verificat de Storage i dels riscos pendents.

Verificacio Storage del 2026-07-09:

- Bucket detectat a la BD real: `announcement-frames`.
- `announcement-frames` es public.
- No s'han detectat policies visibles a `storage.objects`.

Verificacio RLS del 2026-07-09:

- La policy ampla antiga `Users can manage videos in their center` ja no apareix a `pg_policies`.
- `videos` te policies separades de `SELECT`, `INSERT`, `UPDATE`, `DELETE` i lectura publica de landing global.
- `users` te `Users can update own personal profile` en lloc de l'update propi ample antic.
- `video_tags` i `video_hashtags` tenen policies separades de lectura, insercio i esborrat per videos gestionables.

Neteja documental del 2026-07-09:

- S'ha creat `docs/OBSOLET/`.
- S'hi han mogut documents historics, generats o de milestone que ja no son fonts actives.
- S'ha afegit `docs/OBSOLET/README.md` per explicar el contingut i evitar que es faci servir com a estat actual.
- El root `roadmap.md` antic tambe s'ha mogut a `docs/OBSOLET/roadmap.md`.

Actualitzacio documental minima fiable del 2026-07-09:

- S'han reduit documents actius a versions curtes i verificables: domini, rols, autenticacio, moderacio, Vimeo, RSS i Storage.
- S'ha creat `docs/ui/pantalles.md` com a resum viu de pantalles i navegacio.
- S'han mogut a `docs/OBSOLET/` els documents UI llargs antics, les captures de `docs/OBSOLET/imatges ui/` i la versio antiga de `docs/OBSOLET/storage.md`.
- Els punts no decidits es documenten com a pendents, especialment `is_student_editable`, Storage `announcement-frames`, RSS/SSRF i deute de `user_metadata`.

## Punts importants encara oberts

- Revisar si les policies RLS ja aplicades resolen completament els riscos descrits al roadmap, especialment `videos`, `users`, `video_tags` i `video_hashtags`.
- Corregir o decidir la regla de `is_student_editable` per playlists `weekday` i `announcements`.
- Eliminar fallbacks autoritzadors a `user_metadata` en API routes, `proxy.ts` i `AuthContext`; `public.users` ha de ser la font canonica per rol i centre.
- Reduir logs sensibles en fluxos de videos i Vimeo.
- Revisar Storage `announcement-frames`: policies, ownership i flux de pujada/esborrat.
- Revisar RSS URL validation i rotacio per evitar SSRF i dades incoherents.
- Mantenir `docs/database.schema.md` alineat quan hi hagi canvis reals de schema.

## Com s'ha de mantenir aquest fitxer

- Afegir una entrada datada quan es comprovi o es canviï un punt important.
- Distingir sempre entre "verificat a la BD real", "vist al codi", "pendent de provar" i "decisio presa".
- Si una conclusio antiga queda superada per una verificacio nova, no esborrar-la sense rastre: afegir una rectificacio datada.
- No escriure secrets, tokens, URLs completes amb credencials ni dades personals innecessaries.

## Decisions i canvis locals - 2026-07-09

### Mode habitual de llistes i ticker per dies

Decisio de producte implementada i aplicada a la BD remota:

- Les llistes principals passen a organitzar-se com a `permanent`, `weekday`, `custom` amb calendari, `announcements` i `global`.
- `display_settings.default_playlist_mode` decideix el mode habitual del centre quan no hi ha cap `schedule_overrides` actiu; el valor per defecte és `permanent`.
- Les `schedule_overrides` continuen sent la prioritat superior i substitueixen el mode habitual només per a la playlist principal.
- `ticker_messages.playlist_id = null` representa el ticker general del centre.
- `ticker_messages.playlist_id` associat a una playlist `weekday` representa el ticker d'aquell dia; si no hi ha missatges de dia, el display usa el ticker general com a fallback.
- La BD força amb `trg_validate_ticker_message_playlist_scope` que els tickers associats a playlist només apuntin a playlists `weekday` del mateix centre.
- `announcements` i `global` mantenen la lògica existent.

Verificacio a la BD real el 2026-07-09:

- Migracions `20260709120000`, `20260709120100` i `20260709120200` aplicades a `publicat_videos`.
- `display_settings.default_playlist_mode` existeix i tots els 23 centres estan en mode `permanent`.
- Hi ha 23 playlists `permanent`, una per centre, sense duplicats actius.
- `ticker_messages.playlist_id` existeix i no s'han detectat tickers associats a playlists que no siguin `weekday` del mateix centre.

### Neteja de llistes de cap de setmana

Decisio aplicada el 2026-07-09:

- Les playlists `weekday` antigues `Dissabte` i `Diumenge` provenien del model inicial de 7 dies.
- El model actual nomes usa dilluns-divendres; els caps de setmana continuen fent fallback a `Divendres` al display.
- Abans d'eliminar-les, s'ha verificat a la BD real que les 23 playlists `Dissabte` i les 23 playlists `Diumenge` no tenien videos, `schedule_overrides` ni tickers associats.
- La migracio `20260709120300_remove_weekend_weekday_playlists.sql` elimina aquestes playlists obsoletes i falla si detecta dependències.

## Decisions i canvis locals - 2026-07-10

### Eliminació fiable de vídeos i recursos externs

Decisió de producte implementada i aplicada a la BD real `publicat_videos`:

- En eliminar un vídeo, la funció `delete_video_and_queue_cleanup` valida de nou rol i centre, registra la neteja externa i elimina el registre dins d'una sola transacció.
- Les FK existents fan cascada de `playlist_items`, `video_tags`, `video_hashtags` i notificacions; les playlists afectades es renumeren perquè no quedin salts de posició.
- `media_cleanup_jobs` conserva treballs pendents de Vimeo i `announcement-frames` sense FK a `videos`, per poder reintentar-los després de l'esborrat local.
- El servidor prova la neteja immediatament; el cron diari existent la reprèn si Vimeo o Storage fallen. Vimeo `204` i `404` compten com a eliminació correcta.
- La substitució del Vimeo d'una revisió d'alumne també posa a cua el vídeo i els fotogrames anteriors.
- Migració aplicada i registrada: `20260710130000_video_media_cleanup.sql`.

### Logos obligatoris de centre

Decisió de producte implementada i verificada a la BD real `publicat_videos`:

- `centers.logo_url` passa a ser obligatori; els centres existents sense valor reben `/logo_videos.png`, el logo institucional de PUBLI*CAT.
- Els centres nous requereixen un PNG, JPG/JPEG o WebP de fins a 2 MB i com a mínim 256 × 256 px; es recomana 512 × 512 px i la UI no retalla ni deforma el logo.
- L'`admin_global` pot pujar o substituir logos de qualsevol centre. L'`editor_profe` només pot fer-ho al seu propi centre des de «Visor > Configuració de Pantalla».
- La migració local `20260710120000_center_logos.sql` crea el bucket públic `center-logos`. No hi ha escriptura client-side: l'API valida sessió, rol i centre abans d'usar `service_role`.
- Verificació posterior: migració registrada, `logo_url` és `NOT NULL`, els 23 centres existents tenen el fallback de PUBLI*CAT i no hi ha polítiques `storage.objects`; per tant cap client autenticat pot escriure directament al bucket.

### Ticker general del Visor com a reserva

Decisio de producte:

- El bloc `Ticker de missatges` es manté visible a la configuracio del Visor tant en mode `permanent` com en mode `weekday`.
- En mode `permanent`, el ticker del Visor és el ticker principal de pantalla.
- En mode `weekday`, el ticker configurat dins de cada llista de dia té prioritat.
- Si una llista de dia no té ticker propi, el display usa el ticker general del Visor com a reserva.
- `display_settings.show_ticker` continua sent l'interruptor global: si és `false`, no es mostra cap ticker encara que hi hagi missatges generals o de dia.
- No cal cap canvi de BD per aquesta decisio; el model existent `ticker_messages.playlist_id = null` ja representa el ticker general.

## Decisions i canvis locals - 2026-07-16

### Conservació i eliminació automàtica de vídeos

Decisió de producte implementada:

- Els vídeos nous es configuren per defecte per conservar-se fins al primer 31 de juliol que encara no hagi finalitzat.
- També es poden conservar sense límit de temps o fins a una data concreta; totes les dates són inclusives.
- Els 621 vídeos existents abans de la migració es conservaran indefinidament per no imposar una baixa retroactiva als centres.
- L'eliminació automàtica reutilitza el procés atòmic existent: cascades, reindexació de playlists i cua durable de Vimeo i `announcement-frames`.
- La caducitat d'un vídeo pendent no genera una notificació de rebuig.
- La migració nova és `20260716120000_video_retention_and_expiration.sql`.
- La migració s'ha aplicat i registrat a la BD real `publicat_videos`; hi ha 42 migracions locals i 42 versions remotes.
