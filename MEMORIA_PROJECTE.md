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

### Centres participants a la landing publica

Decisio de producte implementada:

- La landing mostra una franja de centres participants entre el hero i la seccio de visio pedagogica.
- La franja inclou nom i logo i nomes publica centres amb `centers.is_active = true`.
- La presentacio visual definitiva usa una capcalera centrada, un degradat fosc visible de `#374151` a `#6B7280` amb textos blancs i una unica banda clara continua; no hi ha targetes separades per centre.
- L'endpoint public de landing limita la resposta a `id`, `name` i `logo_url`; la lectura amb `service_role` es fa exclusivament al servidor.
- La llista es refresca cada cinc minuts, te scroll horitzontal tactil en mobil, pausa en hover/focus i respecta `prefers-reduced-motion`.
- No s'ha requerit cap canvi de schema ni cap migracio.

### Conservació i eliminació automàtica de vídeos

Decisió de producte implementada:

- Els vídeos nous es configuren per defecte per conservar-se fins al primer 31 de juliol que encara no hagi finalitzat.
- També es poden conservar sense límit de temps o fins a una data concreta; totes les dates són inclusives.
- Els 621 vídeos existents abans de la migració es conservaran indefinidament per no imposar una baixa retroactiva als centres.
- L'eliminació automàtica reutilitza el procés atòmic existent: cascades, reindexació de playlists i cua durable de Vimeo i `announcement-frames`.
- La caducitat d'un vídeo pendent no genera una notificació de rebuig.
- La migració nova és `20260716120000_video_retention_and_expiration.sql`.
- La migració s'ha aplicat i registrat a la BD real `publicat_videos`; hi ha 42 migracions locals i 42 versions remotes.

### Indicador d'ús dels vídeos en llistes

Decisió de producte implementada:

- Les targetes de Contingut mostren el nombre de llistes actives diferents que contenen cada vídeo.
- El recompte és global, incloses les llistes d'altres centres que utilitzen un vídeo compartit, perquè l'indicador sigui fiable abans d'eliminar-lo.
- L'API només exposa la xifra agregada; no revela noms, tipus ni centres de les altres llistes.
- Els vídeos sense cap llista activa es destaquen amb «Cap llista» i una fallada del recompte es mostra com «Ús no disponible».
- El recompte representa l'estat actual, no l'historial d'incorporacions, i no requereix cap canvi de schema.

## Reparació conservadora de producció - 2026-10-01

- Treball aïllat des de main/producció 07eb4d7 en el worktree cron-security-review, branca codex/cron-security-2026-10-01. Els canvis locals previs, inclòs ZOOM, no s'han incorporat a la reparació.
- Comptes verificats: GitHub publicat-lacenet amb identitat publicat-lacenet <publicat@xtec.cat>; Vercel publicat-3848, equip lacenets-projects, projecte prj_H1mbvmSDdVpDQZuscdKxTjb6lX5M. Supabase publicat_videos/tvsafusrasfzubiujavk consultat només de lectura; 43 migracions remotes. Cap canvi SQL/Auth/RLS.
- CRON_SECRET generat amb 48 bytes aleatoris criptogràfics, configurat com a variable sensible exclusivament de producció, sense publicar-lo. La verificació Bearer i el codi del cron es conserven.
- Commit funcional 40aa961: Next 16.3.8, React/React DOM 19.2.8, eslint-config-next 16.3.8 i transitives corregides. Supabase JS 2.84.0, SSR 0.7.0, Vimeo Player 2.30.1, Tailwind 4.1.17 i la resta de llibreries de domini es conserven. No s'ha utilitzat audit fix --force ni afegit dependències.
- Rectificació de l'auditoria: main net tenia 15 paquets afectats (1 crítica, 10 altes, 3 moderades, 1 baixa), no els 45 de l'estat local amb canvis previs. Auditoria final: 0 vulnerabilitats conegudes, incloent desenvolupament.
- Build local, build remot Vercel, TypeScript i diff --check correctes. Lint de main: 67 errors/18 warnings; final: els mateixos 67 errors/19 warnings. L'avís nou és no-location-assign-relative-destination a pantalla/sign-out-button.tsx, codi sense modificar. No s'ha desactivat cap regla.
- Desplegament verificat i promogut: dpl_4Ty1HYhZ7Sf3RSeqXvopWH6CfzEC (40aa961), READY. www.publicat.org i publicat-lovat.vercel.app: landing/login/playlist HTTP 200, 20 vídeos amb IDs i ordre idèntics; endpoints protegits 401 i redireccions esperades. Navegador modern: landing/login i progrés real de Vimeo sense errors de pàgina detectats. Cap prova completa d'edició autenticada per rols ni prova física de TV.
- Execució manual única del cron autoritzada explícitament per l'usuari després d'inspeccionar l'abast: 0 vídeos caducats, 26 neteges elegibles (31 pendents totals), límit 20. HTTP 200 en 150,743 s; 29/31 feeds actualitzats, 0 desactivats, 0 vídeos caducats eliminats.
- Neteja Vimeo pendent: els 20 intents han retornat 403, cap neteja completada; 31 treballs continuen pendents amb reintents. /oauth/verify confirma scopes private/upload/video_files/public i absència de delete. Cal un token del mateix compte amb els permisos actuals més delete; no cal modificar el codi ni eliminar la cua. No s'ha repetit el cron.
- Regió7 - Berguedà i Regió7 - Moianès retornen HTTP 406. Reproduït només de lectura amb el parser original sense les actualitzacions: no és una regressió observada de les dependències.
- Cron Vercel habilitat a 0 0 * * * i apuntant al desplegament promogut. Bearer absent/incorrecte: 401 als dos dominis. L'execució real del següent torn programat encara s'ha d'observar; la prova manual no la substitueix.
- Decisió de l'usuari: prioritzar seguretat i verificar el funcionament existent, sense adaptacions específiques per a la TCL ni canvis del reproductor en aquesta reparació. Les troballes de robustesa i user_metadata del visor continuen pendents a docs/revisio-2026-10-01.md.

## Reparació de captures només d'anuncis - 2026-10-01

- Causa verificada: pujada client-side a `announcement-frames` sense policies RLS; els errors quedaven a consola i el visor mostrava la miniatura. Hi ha 2 centres en mode slideshow, però 0 captures emmagatzemades.
- Implementació aïllada en `codex/announcement-frames`, sobre `a35e651`: s'elimina l'extracció indiscriminada de `VideoUploader`. Només després de desar un vídeo de tipus `announcement`, i si hi ha un fitxer nou disponible, el formulari extreu i envia captures. Un vídeo `content` no genera ni puja captures; el servidor també ho rebutja.
- Nova API `POST /api/videos/[id]/frames`: sessió verificada amb getUser, perfil actiu de public.users, rol/centre/propietari validats. Professor del centre i admin global; alumne només el seu vídeo pendent o en revisió. Sense fallback a metadades. Escriptura de Storage exclusivament al servidor amb service_role, sense obrir policies ni executar migracions.
- Límits: JPEG 640x360, interval de 3 segons, màxim 30 captures, màxim 128 KiB per captura (3,75 MiB per lot). Es limita l'extracció abans de recórrer el vídeo complet. Noms d'objectes generats pel servidor sota l'ID real del vídeo, sense upsert públic. Les URL s'adjunten només quan s'ha pujat tot el lot i si no han canviat vídeo Vimeo, tipus, estat, centre o captures anteriors.
- Si falla una pujada o el vídeo canvia, no es substitueixen les captures anteriors i es neteja el lot parcial. Les captures substituïdes del mateix vídeo es netegen; les fallades de neteja es posen a media_cleanup_jobs. No es netegen altres vídeos ni anuncis d'anys anteriors.
- El formulari espera el resultat abans de tancar-se i mostra un avís si l'anunci s'ha desat però les captures fallen. Diapositives conserva la miniatura sense captures i la fa servir també quan una captura referenciada no es pot carregar.
- Instrucció expressa de l'usuari: no generar captures retrospectivament, no eliminar anuncis ni imatges de cursos anteriors. Els existents mantenen la miniatura. L'usuari autoritza publicar aquesta reparació per provar-la posteriorment amb una pujada real.
- Validació: 8 grups de proves amb Node (autorització, contingut exclòs, fitxers invàlids, pujada parcial, concurrència, neteja i miniatura). TypeScript correcte. Chromium amb MP4 sintètic local de 7 s: 3 JPEG reals 640x360, 14105 bytes totals; prova amb interval curt limitada a 30. Això no representa la mida mitjana de vídeos reals. API local anònima HTTP 401. Lint global 67 errors / 19 warnings, igual que la base desplegada; error de setState dins effect d'AnnouncementSlideshow i warning uploading de VideoUploader preexistents.
- La landing local carrega; el reproductor Vimeo registra errors d'embedding a localhost (no s'han modificat VimeoPlayer ni permisos Vimeo). Pendent prova completa autenticada d'una pujada real a producció i prova de neteja real. Les proves d'API usen dobles de Supabase, sense mutacions a la BD real.
- No s'han incorporat canvis locals ZOOM, dependències addicionals, modificacions d'Auth/RLS/schema ni execucions manuals del cron.
