# Roadmap de revisio completa del projecte PUBLI*CAT

## Objectiu

Fer una revisio completa, ordenada i documentada del projecte PUBLI*CAT per verificar que el codi, la base de dades, els permisos, els fluxos funcionals i la documentacio estan alineats.

Aquest document es el punt de continuitat entre converses. Cada fase s'ha de treballar preferentment sense barrejar-la amb les altres, anotant aqui:

- que s'ha revisat,
- quines evidencies s'han trobat,
- quines conclusions se'n treuen,
- quins riscos o dubtes queden oberts,
- quines correccions s'haurien de plantejar al pas 7.

Durant els passos 1 a 6, la prioritat es auditar i entendre. Les correccions s'han de reservar per al pas 7, excepte si l'usuari demana explicitament aplicar un canvi abans.

## Estat general

- Data d'inici: 2026-07-07
- Projecte Supabase: `tvsafusrasfzubiujavk` (`publicat_videos`)
- Repo local: `D:\Drive shorrill\app-videos-lacenet`
- Font operativa per agents: `AGENTS.md`
- Estat: Pas 7 iniciat amb matriu prioritzada i primera tongada de correccions de codi aplicada; pendents migracions/RLS, dades i documentacio final

## Resum executiu viu

Anotar aqui el resum curt que s'anira actualitzant despres de cada fase.

- Punts forts:
  - BD real accessible via `DATABASE_URL` i coherent amb el projecte Supabase esperat.
  - Totes les taules publiques detectades tenen RLS activat.
  - Les correccions recents de funcions (`search_path`) i revocacio d'`EXECUTE` public consten aplicades a la BD real.
  - El trigger duplicat de notificacions pendents ja no existeix a la BD real.
- Riscos principals:
  - El registre `supabase_migrations.schema_migrations` no reflecteix totes les migracions locals aplicades manualment.
  - `docs/DB-AUDIT-REPORT.md` esta desfasat respecte de la BD real.
  - `docs/database.schema.md` barreja esquema real, recomanacions i taules futures, i no es pot usar com a foto exacta.
  - `audit_logs` i `guest_access_links` tenen RLS activat pero cap politica definida.
  - La policy antiga `Users can manage videos in their center` dona `ALL` sobre `videos` a qualsevol usuari autenticat del mateix centre, inclosos `editor_alumne` i `display`.
  - La policy `Users can update own profile` a `users` permet `UPDATE` sobre el propi perfil sense `WITH CHECK` ni restriccio de columnes a nivell RLS.
  - Les policies de gestio de `video_tags` i `video_hashtags` es basen en visibilitat del video, no en capacitat real de gestio.
  - `editor_alumne` pot gestionar playlists marcades `is_student_editable` amb policy `ALL`, mes ampli que el model funcional esperat.
  - Algunes API routes encara fan decisions de permisos amb fallback a `user_metadata` si no troben perfil a `public.users`.
  - `PATCH`/`DELETE /api/videos/[id]` ja s'han endurit en codi al Pas 7 per llegir `public.users` i bloquejar rols no editors; queda pendent alinear RLS per defensa en profunditat.
  - Els endpoints de items de playlists reforcen parcialment permisos, pero no bloquegen explicitament rols desconeguts/display i permeten que `editor_alumne` afegeixi videos a llistes editables sense validar sempre `published`.
  - `POST /api/vimeo/upload/ticket` i `GET /api/vimeo/status/[videoId]` ja validen rol al Pas 7; queda pendent revisar rate limiting i ownership/flux de pujada.
  - `proxy.ts` autoritza rutes per rol amb `user_metadata` i deixa passar si el rol no hi es; la proteccio real queda delegada a pages/API/RLS.
  - `/api/cron/fetch-rss` ja exigeix `CRON_SECRET` en entorns no locals al Pas 7; queda pendent configurar el secret en entorns desplegats i documentar-ho.
  - Hi ha logs de servidor que imprimeixen email, rol, centre, `user_metadata`, `app_metadata` i resposta de Vimeo en fluxos de videos; el log sensible de Vimeo status s'ha retirat al Pas 7, pero queden logs de videos.
  - El flux real de playlists compleix dades netes per items publicats/anuncis/globals, pero permet marcar `weekday` i `announcements` com editables per alumnes.
  - Un centre actiu (`Escola PIA d'IGUALADA`) no te cap `editor_profe` actiu.
  - El bucket `announcement-frames` existeix, pero no hi ha policies de Storage; la pujada client-side de fotogrames probablement falla silenciosament.
  - Hi ha 16 videos `needs_revision` i 0 notificacions `video_needs_revision` a la BD real.
- Decisions pendents:
  - Decidir si cal registrar o documentar formalment les migracions aplicades manualment fora de `schema_migrations`.
  - Decidir si `audit_logs` i `guest_access_links` han de continuar tancades sense policies o han de tenir politiques explicites.
  - Decidir si la BD ha de tancar completament l'escriptura directa de perfils, videos i playlists per rols no editors, encara que l'API ja faci validacions.
  - Decidir si el fallback a `user_metadata` s'ha d'eliminar completament de les API routes o mantenir-se nomes com a compatibilitat no autoritzadora.
  - Decidir si `user_metadata` ha de deixar de contenir rol/centre i si cal migrar aquesta informacio cap a `public.users` exclusivament o `app_metadata` nomes com a cache no autoritzadora.
- Correccions candidates:
  - Actualitzar documentacio de BD amb una foto real nova.
  - Revisar traçabilitat de migracions no registrades.
  - Revisar policies pendents a `audit_logs` i `guest_access_links` al Pas 2.
  - Substituir policies RLS massa amples per policies per operacio i rol, especialment a `users`, `videos`, `playlists`, `playlist_items`, `video_tags` i `video_hashtags`.
  - Refactoritzar helpers d'autorizacio server-side compartits per API routes per llegir sempre rol/centre de `public.users`.
  - Endurir `proxy.ts` i `AuthContext` per no prendre decisions de rol des de `user_metadata`.
  - Fer obligatori `CRON_SECRET` per al cron en qualsevol entorn desplegat i retornar error si falta.
  - Reduir logs sensibles en endpoints de videos/Vimeo.
  - Corregir invariants de playlist editable per alumnes i dades existents.
  - Revisar centre sense `editor_profe` actiu i flux de notificacions `needs_revision`.
  - Afegir policies/documentacio de Storage per `announcement-frames` o eliminar el flux si es considera opcional.

---

# Pas 1. Base de dades real vs documentacio

## Objectiu

Comparar l'estat real de Supabase amb la documentacio i les migracions del repo. Aquest pas ha de donar una foto fiable de la BD actual.

## Fonts a revisar

- BD real de Supabase via `DATABASE_URL` o eina disponible.
- `supabase/migrations/`
- `docs/DB-AUDIT-REPORT.md`
- `docs/database.schema.md`
- `docs/model-data.md`
- `README.md`
- `AGENTS.md`

## Que cal comprovar

- Taules, columnes, tipus, defaults i constraints.
- Enums.
- Foreign keys i regles `ON DELETE`.
- Indexos.
- Triggers i funcions.
- Views, schemas no publics i extensions.
- Diferencies entre migracions, docs i BD real.

## Evidencies recollides

- Sessio: 2026-07-07, mode nomes lectura excepte aquesta anotacio final.
- Fonts llegides: `AGENTS.md`, `README.md`, `PROJECT_REVIEW_ROADMAP.md`, `docs/DB-AUDIT-REPORT.md`, `docs/database.schema.md`, `docs/model-data.md` i migracions clau de `supabase/migrations/`.
- Connexio BD real via `DATABASE_URL` de `.env.local`: `current_database() = postgres`, `current_user = postgres`, PostgreSQL 17.6, consulta a data 2026-07-07.
- Taules publiques reals detectades: 20. Llista: `audit_logs`, `centers`, `display_settings`, `guest_access_links`, `hashtags`, `notifications`, `playlist_items`, `playlists`, `rss_center_settings`, `rss_feeds`, `rss_items`, `rss_rotation_order`, `schedule_overrides`, `tags`, `ticker_messages`, `users`, `video_hashtags`, `video_tags`, `videos`, `zones`.
- Totes les taules publiques tenen RLS activat.
- Taules amb RLS activat i 0 policies: `audit_logs`, `guest_access_links`. `schedule_overrides` te 4 policies i ja no encaixa amb l'avís antic de `docs/model-data.md`.
- Enums reals: `user_role = {admin_global, editor_profe, editor_alumne, display}`, `onboarding_status = {invited, active, disabled}`, `video_type = {content, announcement}`, `video_status = {pending_approval, published, needs_revision}`, `playlist_kind = {weekday, announcements, custom, global, landing}`.
- Files reals per taula en el moment de la consulta: `rss_items=13803`, `notifications=1796`, `video_tags=849`, `videos=621`, `schedule_overrides=567`, `video_hashtags=207`, `playlists=197`, `playlist_items=170`, `hashtags=99`, `users=69`, `rss_feeds=30`, `centers=23`, `rss_rotation_order=18`, `ticker_messages=13`, `tags=12`, `zones=8`, `display_settings=6`, `rss_center_settings=1`, `audit_logs=0`, `guest_access_links=0`.
- Views publiques: cap view detectada a `public`.
- Extensions detectades: `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`.
- Funcions publiques detectades: `assign_lacenet_to_admin_global`, `create_default_playlists_for_center`, `notify_pending_video`, `notify_video_approved`, `notify_video_needs_revision`, `notify_video_rejected`, `notify_video_resubmitted`, `set_updated_at`, `set_video_zone_id`, `sync_user_email`.
- Funcions privades detectades: `private.current_user_role`, `private.current_user_center_id`.
- Les funcions revisades tenen `search_path=public, pg_temp`. Les funcions trigger publiques tenen `EXECUTE` restringit a `postgres` i `service_role`; les funcions privades tenen `EXECUTE` per `authenticated` i `postgres`.
- Triggers reals principals: `tr_auth_user_email_sync`, `tr_center_default_playlists`, triggers `*_updated_at`, `tr_ticker_messages_updated_at`, `tr_assign_lacenet_to_admin`, `on_video_pending`, `on_video_status_change`, `on_video_rejected`, `on_video_needs_revision`, `on_video_resubmitted`, `tr_videos_set_zone_id`, `tr_videos_update_zone_id`.
- No existeix el trigger duplicat antic `tr_video_pending_notification`; nomes queda `on_video_pending` per `notify_pending_video()`.
- Registre de migracions: 34 fitxers locals a `supabase/migrations/`, pero nomes 29 versions registrades a `supabase_migrations.schema_migrations`.
- Versions locals no registrades a `schema_migrations`: `20260226130000_add_none_announcement_mode.sql`, `20260227100000_m3d_revision_feedback.sql`, `20260302120000_rss_image_height.sql`, `20260304100000_fix_rls_editor_alumne_playlists.sql`, `20260707120000_fix_security_advisor_warnings.sql`.
- Malgrat no estar registrades, s'han vist efectes reals d'aquestes migracions: `announcement_mode` accepta `none`, `video_status` inclou `needs_revision`, `rss_center_settings.image_height_percent` existeix, les policies de playlists inclouen `editor_alumne` quan `is_student_editable = true`, i les funcions tenen `search_path` fixat amb grants restringits.
- Diferencies destacades respecte `docs/DB-AUDIT-REPORT.md`: l'informe es de 2026-01-19, parla de 14 taules/18 migracions i no recull RSS complet, display, ticker, schedule, revisio de videos, `frames_urls`, ni correccions de juliol.
- Diferencies destacades respecte `docs/database.schema.md`: descriu part de l'esquema com a recomanacio; inclou camps no existents a la BD real (`rss_center_settings.max_items_per_feed`, `rss_center_settings.updated_by_user_id`, `guest_access_links.revoked_by_user_id`, `guest_access_links.full_name`) i no reflecteix completament camps reals com `videos.frames_urls`, `display_settings.announcement_mode`, `rss_center_settings.image_height_percent` o `ticker_messages`.
- Diferencies destacades respecte `docs/model-data.md`: es mes proper a la realitat que `DB-AUDIT-REPORT.md`, pero les estadistiques de files estan desfasades i alguns avisos ja no son certs, especialment `schedule_overrides` sense policies, trigger duplicat i funcions sense `search_path`.

## Conclusions

- La BD real esta substancialment mes avançada que `docs/DB-AUDIT-REPORT.md`; aquest informe no s'hauria d'usar com a font fiable sense actualitzacio.
- L'esquema real sembla alineat amb les migracions locals fins i tot per canvis posteriors no registrats a `schema_migrations`, cosa que indica aplicacio manual parcial o fora del flux CLI.
- La traçabilitat de migracions es el principal problema del Pas 1: el cataleg de Supabase no reflecteix cinc migracions locals que aparentment si han deixat efectes reals.
- La superficie real de BD per als passos seguents es de 20 taules publiques, 5 enums, cap view publica, funcions trigger amb `search_path` fixat, i esquema `private` per evitar recursio RLS a `users`.
- El problema critic antic de policies `users` massa amples esta corregit a la BD real: insert/delete queden restringits a `admin_global` mitjancant funcions `private`.
- `audit_logs` i `guest_access_links` estan tancades per RLS sense policies; pot ser intencional, pero cal revisar-ho al Pas 2 i al Pas 5 segons si aquestes funcionalitats han d'existir a l'app.

## Riscos o dubtes

- Risc de drift operatiu: si es reprodueix l'entorn a partir de `schema_migrations`, faltaran migracions registrades tot i que el fitxer local existeix.
- Risc documental: la documentacio actual pot portar a conclusions falses sobre taules, counts, policies i warnings ja resolts.
- Dubte: per que les cinc migracions locals no consten a `schema_migrations` si els seus efectes son visibles a la BD real.
- Dubte: `audit_logs` i `guest_access_links` son futures/no implementades o haurien de tenir accessos d'admin/editor.
- Dubte: algunes policies encara consulten `public.users` directament fora de la taula `users`; avaluar al Pas 2 si poden causar problemes de recursio, rendiment o permisos.

## Correccions candidates per al pas 7

- Crear un informe nou de BD real o actualitzar `docs/DB-AUDIT-REPORT.md` amb data 2026-07-07.
- Clarificar `docs/database.schema.md`: separar "esquema real" de "recomanacions/futur".
- Documentar explícitament que les migracions `20260226130000`, `20260227100000`, `20260302120000`, `20260304100000` i `20260707120000` estan aplicades manualment pero no registrades a `supabase_migrations.schema_migrations`, o decidir una estrategia segura per reconciliar el registre.
- Revisar i, si toca, afegir policies a `audit_logs` i `guest_access_links`.
- Revisar si cal afegir indexes a FKs encara no indexades, especialment en taules amb volum (`videos`, `playlist_items`, `notifications`, `rss_rotation_order`, `schedule_overrides`), despres de validar-ho amb advisors o consultes de rendiment.
- Revisar si cal migrar policies restants cap a helpers `private.*` o subselects `SELECT auth.uid()` per reduir fragilitat i cost.

---

# Pas 2. RLS i permisos per rol

## Objectiu

Verificar que les politiques RLS implementen correctament el model multi-tenant i els rols del producte.

## Rols a revisar

- `anon`
- `authenticated`
- `admin_global`
- `editor_profe`
- `editor_alumne`
- `display`

## Taules critiques

- `users`
- `centers`
- `zones`
- `videos`
- `tags`
- `hashtags`
- `video_tags`
- `video_hashtags`
- `playlists`
- `playlist_items`
- `notifications`
- taules RSS
- taules display/schedule
- qualsevol taula nova detectada al pas 1

## Que cal comprovar

- Que `anon` nomes pot accedir al que sigui public de veritat.
- Que cada usuari autenticat queda limitat al seu centre excepte `admin_global`.
- Que els videos compartits es veuen com toca, sense exposar contingut pendent o privat.
- Que `editor_alumne` no pot veure/modificar contingut d'altres alumnes si no correspon.
- Que `display` no te capacitats d'edicio.
- Que no hi ha policies massa amples sense justificacio.
- Que no hi ha recursio RLS ni dependencies fragils.

## Evidencies recollides

- Sessio: 2026-07-07, mode nomes lectura sobre codi i BD; unica escriptura feta en aquest document de roadmap.
- Fonts llegides: `AGENTS.md`, `README.md`, `PROJECT_REVIEW_ROADMAP.md`, `docs/roles.md`, `docs/domain-model.md`, `docs/overview.md`, `docs/DB-AUDIT-REPORT.md` i migracions de `supabase/migrations/`.
- Consulta real a `pg_policies`: 57 policies RLS a l'esquema `public`.
- RLS continua actiu a totes les taules publiques revisades; `audit_logs` i `guest_access_links` segueixen amb 0 policies i, per tant, sense files visibles per `anon`/`authenticated` tot i tenir grants de taula.
- Grants detectats: `anon` i `authenticated` tenen privilegis amplis de taula (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, etc.) sobre les taules publiques; la proteccio efectiva depen sobretot de RLS.
- Policies publiques/anon detectades:
  - `playlists`: `Public can view global playlists`, nomes `kind = 'global'`, `is_active = true`, `center_id IS NULL`.
  - `playlist_items`: `Public can view global playlist items`, nomes items de playlists globals actives.
  - `videos`: `Public can view global playlist videos`, nomes videos en playlist global, `published` i `is_shared_with_other_centers = true`.
  - Les policies de `videos` i `notifications` amb rol `{public}` depenen d'`auth.uid()` i no retornen files a `anon` si no hi ha usuari.
- Simulacio de SELECT amb `SET ROLE authenticated` i `request.jwt.claim.sub` sobre usuaris actius reals:
  - `admin_global`: veu 69 `users`, 23 `centers`, 8 `zones`, 621 `videos`, 197 `playlists`, 170 `playlist_items`, 30 `rss_feeds`, 13803 `rss_items`, 567 `schedule_overrides`.
  - `editor_profe` mostrat: veu 11 `users`, 23 `centers`, 8 `zones`, 287 `videos`, 11 `playlists`, 41 `playlist_items`, 11 `rss_feeds`, 4587 `rss_items`, 3 `schedule_overrides`.
  - `editor_alumne` mostrat: veu 27 `users`, 23 `centers`, 8 `zones`, 561 `videos`, 9 `playlists`, 102 `playlist_items`, 2 `rss_feeds`, 696 `rss_items`, 0 `schedule_overrides`.
  - `display` mostrat: veu exactament el mateix volum que l'`editor_alumne` del mateix centre per les taules consultades.
  - `anon`: veu 20 `videos`, 1 `playlist` i 20 `playlist_items`; 0 files a la resta de taules.
- Estat real de videos per comparticio/estat:
  - `needs_revision` no compartits: 16.
  - `pending_approval` no compartits: 1.
  - `published` no compartits: 336.
  - `published` compartits: 268.
- Estat real de playlists per tipus i `is_student_editable`:
  - `announcements` amb `is_student_editable = true`: 2.
  - `weekday` amb `is_student_editable = true`: 6.
  - `custom` amb `is_student_editable = true`: 2.
  - Aixo contradiu la regla de domini que `announcements` i globals sempre haurien de considerar-se no editables per alumnes; no hi ha globals editables detectades.
- Policies de `users`:
  - `Only admin_global can insert users` i `Only admin_global can delete users` usen helpers `private.current_user_role()`.
  - Persisteixen `Users can view own profile`, `Users can view profiles in scope` i `Users can update own profile`.
  - `Users can update own profile` es `UPDATE TO authenticated USING (id = auth.uid())` sense `WITH CHECK` i sense restriccio de columnes.
- Policies de `videos`:
  - Les policies fines de moderacio existeixen (`Editor-alumne can create/view/update own needs_revision`, `Editor-profe can approve/delete/view all center videos`).
  - Pero continua activa `Users can manage videos in their center` amb `ALL TO authenticated USING (center_id = current_user.center_id OR role = admin_global)`.
  - Aquesta policy amplia la capacitat d'escriptura a qualsevol usuari autenticat del centre, inclosos `editor_alumne` i `display`, i pot deixar sense efecte practic part de les policies fines.
  - `Videos are viewable by center or if shared` permet veure qualsevol video compartit sense filtrar `status = published`; ara mateix tots els videos compartits reals son `published`, pero la policy no ho garanteix.
- Policies de `playlists` i `playlist_items`:
  - `Playlists are viewable by center or if global` encaixa amb centre propi/global/admin.
  - `Editors can manage playlists in their center` es `ALL` i inclou `editor_alumne` si `is_student_editable = true`, cosa mes ampla que el domini: l'alumne no hauria de crear, eliminar ni canviar propietats de llistes.
  - `Playlist items are manageable by playlist access` tambe es `ALL`; permet l'edicio d'items si la playlist es editable per alumne.
  - `Playlist items are viewable by playlist access` usa `EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_items.playlist_id)`, dependent de RLS sobre `playlists`.
- Policies de `video_tags` i `video_hashtags`:
  - Les policies de gestio usen `EXISTS (SELECT 1 FROM videos WHERE videos.id = ...)`, que comprova visibilitat segons RLS de `videos`, no permis de gestio.
  - Amb la visibilitat de videos compartits, un usuari autenticat podria quedar autoritzat per modificar relacions de tags/hashtags de videos que nomes hauria de veure, depenent de l'operacio i API.
- Policies de catalegs i metadades:
  - `centers` i `zones` son visibles per tots els `authenticated` (`USING true`), coherent amb la necessitat de metadata de videos compartits, pero mes ampli que tenant isolation estricta.
  - `tags` son visibles per tots els `authenticated` i gestionables nomes per `admin_global`.
  - `hashtags` queden limitats a centre propi o admin; gestio per `admin_global`/`editor_profe`.
- Policies RSS/display/schedule/ticker:
  - `rss_feeds`, `rss_items`, `rss_center_settings`, `rss_rotation_order`, `display_settings`, `ticker_messages` i `schedule_overrides` segueixen el patro centre propi o `admin_global` per SELECT.
  - Les operacions d'escriptura es limiten a `editor_profe` del centre o `admin_global`, excepte que moltes policies no fan servir `WITH CHECK` explicit en UPDATE.
- Dependencia tecnica:
  - Moltes policies encara consulten directament `public.users` amb subselects `(SELECT role/center_id FROM users WHERE id = auth.uid())`.
  - La recursio critica a `users` sembla resolta amb helpers `private.*`, pero queda deute de consistencia/performance i fragilitat si es canvien policies de `users`.

## Conclusions

- L'aillament de lectura multi-tenant funciona en el sentit general: usuaris autenticats veuen el seu centre, `admin_global` veu global, i `anon` queda limitat a la playlist publica global.
- La principal excepcio intencional es que `centers` i `zones` son visibles per tots els autenticats per poder mostrar metadata de contingut compartit.
- El risc mes alt no es la lectura sino l'escriptura directa via Data API/Supabase client: diverses policies `ALL` o `UPDATE` son massa amples per al model de rols documentat.
- `users` mante una policy que permet actualitzar el propi perfil; si el client pot escriure a `public.users`, cal restringir columnes o moure aquesta capacitat a API server-side, per evitar canvis indeguts de rol, centre, estat o camps sensibles.
- `videos` conserva una policy antiga de gestio per centre que entra en conflicte amb el sistema de moderacio: `editor_alumne` i `display` no haurien de poder gestionar tots els videos del centre.
- `video_tags` i `video_hashtags` necessiten separar visibilitat de capacitat d'edicio; l'estat actual pot permetre canvis de classificacio sobre videos visibles pero no propis/gestionables.
- Les policies de playlists permeten a `editor_alumne` mes del que diu el domini quan una playlist es `is_student_editable`: caldria limitar l'alumne als items i no a propietats/creacio/eliminacio de la playlist.
- Les taules `audit_logs` i `guest_access_links` estan efectivament tancades per RLS, cosa segura per defecte, pero incoherent amb el model funcional de convidats si aquesta funcionalitat s'ha d'activar.
- L'us extensiu de grants amplis a `anon`/`authenticated` fa que qualsevol relaxacio futura de RLS tingui impacte immediat; cal considerar `REVOKE` selectiu o, com a minim, policies mes estrictes.

## Riscos o dubtes

- Critic/alt: possible escalada de privilegis o corrupcio de dades si un usuari autenticat usa directament l'API de Supabase contra `public.users`, `videos`, `playlists`, `playlist_items`, `video_tags` o `video_hashtags`.
- Alt: `display` no queda blindat a nivell RLS com a rol passiu per a `videos` si es manté la policy `Users can manage videos in their center`.
- Alt: `editor_alumne` pot quedar autoritzat per accions d'edicio massa amples per policies heretades (`videos` i `playlists`).
- Mitja: `Videos are viewable by center or if shared` no exigeix `status = published` per contingut compartit; ara les dades compleixen aquesta invariant, pero la BD no la reforça.
- Mitja: playlists `announcements` i `weekday` amb `is_student_editable = true` poden contradir les invariants de domini i ampliar edicio d'alumnes.
- Mitja: les policies de `rss_center_settings`, `rss_feeds`, `display_settings`, `ticker_messages` i `schedule_overrides` haurien de revisar `WITH CHECK` explicit en UPDATE per evitar reassignacions o valors fora d'abast, encara que algunes ja el tenen.
- Dubte: si la UI/API bloqueja tots aquests casos, igualment cal decidir si RLS ha de ser la defensa forta contra clients directes.
- Dubte: si la playlist publica hauria d'usar `kind = 'landing'` o l'actual `kind = 'global'`; queda per validar al Pas 5 amb el flux de landing.

## Correccions candidates per al pas 7

- Substituir `Users can update own profile` per una politica mes estreta o eliminar l'UPDATE directe i gestionar perfils via API; si cal edicio d'usuari, limitar-la a camps segurs.
- Eliminar o refactoritzar `Users can manage videos in their center`; crear policies separades per `INSERT`, `UPDATE`, `DELETE` i rol:
  - `editor_profe` i `admin_global`: gestio de videos dins abast.
  - `editor_alumne`: crear videos propis pendents i actualitzar nomes propis en estats permesos.
  - `display`: cap escriptura.
- Ajustar `Videos are viewable by center or if shared` per exigir `status = 'published'` quan el video es visible per comparticio intercentre.
- Refactoritzar `video_tags` i `video_hashtags` per permetre escriptura nomes si l'usuari pot gestionar el video, no nomes veure'l.
- Separar policies de `playlists` i `playlist_items`: els alumnes no haurien de fer `ALL` sobre `playlists`; nomes gestionar items de llistes permeses i amb videos publicats.
- Corregir dades o constraints/invariants per `is_student_editable` en playlists `announcements`, `weekday` o altres tipus no permesos.
- Decidir i documentar policies per `guest_access_links` i `audit_logs`; mantenir-les tancades si son futures, o afegir politiques estrictes si s'activen.
- Revisar grants amplis a `anon` i `authenticated`; considerar revocar privilegis innecessaris de taules internes i confiar menys en grants globals.
- Migrar progressivament policies que consulten `public.users` cap a helpers `private.current_user_role()` i `private.current_user_center_id()` o subselects optimitzats, per consistencia i rendiment.

---

# Pas 3. API routes vs RLS

## Objectiu

Comprovar que les API routes reforcen els permisos al servidor i no depenen nomes de la UI, `proxy.ts` o RLS.

## Superficie a revisar

- `app/api/videos`
- `app/api/admin`
- `app/api/playlists`
- `app/api/rss`
- `app/api/vimeo`
- `app/api/landing`
- `app/api/auth`
- qualsevol endpoint detectat durant la revisio

## Que cal comprovar

- Autenticacio amb `supabase.auth.getUser()`.
- Lectura de rol i centre des de `public.users`.
- Validacio server-side abans de crear, editar o eliminar.
- Errors consistents i en catala quan sigui adequat.
- Absencia d'us indegut de `service_role`.
- Absencia de decisions critiques basades en `user_metadata`.
- Coherencia entre API, RLS i UI.

## Evidencies recollides

- Sessio: 2026-07-07, mode nomes lectura sobre codi/API; unica escriptura feta en aquest document de roadmap.
- Fonts llegides: `AGENTS.md`, `PROJECT_REVIEW_ROADMAP.md`, skill Supabase, i endpoints dins `app/api/`.
- Superficie API detectada: 43 fitxers `route.ts` sota `app/api`, amb endpoints per `videos`, `playlists`, `admin`, `center/users`, `rss`, `display`, `schedule-overrides`, `vimeo`, `landing`, `cron`, `notifications`, `tags`, `hashtags`, `centers`, `zones` i `auth/me`.
- Patrons positius generals:
  - La majoria d'endpoints criden `supabase.auth.getUser()` abans de tocar dades autenticades.
  - Les rutes d'administracio global (`app/api/admin/users`, `admin/centers`, `admin/zones`) consulten `public.users` i exigeixen `admin_global`.
  - Les rutes de gestio d'usuaris de centre (`app/api/center/users`) consulten `public.users`, limiten a `editor_profe`/`admin_global`, verifiquen mateix centre i usen `service_role` nomes despres d'aquestes comprovacions.
  - Notificacions filtren explicitament per `user_id = user.id` en GET/PATCH/DELETE, a mes de RLS.
  - RSS/display/settings/ticker/schedule tenen comprovacions de rol per escriptura (`editor_profe` o `admin_global`) en la majoria de casos.
- Us de `service_role`:
  - Detectat a usuaris admin/centre, RSS item ingestion/retry i cron RSS.
  - En general esta encapsulat en endpoints server-side i precedit per comprovacions de rol/centre, excepte el cron que es protegeix amb `CRON_SECRET`.
  - A `app/api/admin/users/route.ts`, si falla la insercio del perfil, el cleanup crida `supabase.auth.admin.deleteUser(...)` amb el client de sessio en lloc del `supabaseAdmin` creat amb service role; pot fallar el rollback d'Auth.
- Fallbacks a `user_metadata`:
  - Moltes rutes calculen permisos amb `dbUser?.role || user.user_metadata?.role` i `dbUser?.center_id || user.user_metadata?.center_id`.
  - Això apareix a `videos`, `playlists`, `rss`, `display`, `schedule-overrides`, `rss/settings`, `rss/rotation`, `rss/validate`, `display/config`, `display/playlist`.
  - `app/api/videos/[id]/route.ts` es especialment problematic: llegeix primer `user.user_metadata?.role` i `user.user_metadata?.center_id`, i nomes consulta `public.users` si falten (`role`/`centerId`).
- `app/api/videos/route.ts`:
  - `GET` autentica, prioritza `public.users`, filtra estats per rol i filtra extra `editor_alumne` en backend; pero si es demana `status` explicit pot recolzar-se en RLS per no exposar mes.
  - `GET` per defecte d'`editor_profe`/`admin_global` inclou `published` i `pending_approval`, pero no `needs_revision`; possible divergencia funcional per moderacio.
  - `POST` autentica, prioritza `public.users`, permet `editor_alumne`/`editor_profe`/`admin_global`, força `editor_alumne` a `pending_approval` i no permet compartir. Exigeix almenys un tag.
- `app/api/videos/[id]/route.ts`:
  - `PATCH` valida accés inicial només amb `finalRole !== 'admin_global' && video.center_id !== effectiveCenterId`.
  - Les accions `request_revision` i `submit_revision` tenen comprovacions de rol/estat/propietari raonables.
  - El cas d'"edicio normal" esta comentat com `editor_profe / admin_global`, pero no fa cap `if` explícit que bloquegi `editor_alumne`, `display` o altres rols abans d'actualitzar camps com `title`, `description`, `type`, `frames_urls` i `is_shared_with_other_centers`.
  - `status` nomes es canvia si `finalRole === 'editor_profe'`, pero `is_shared_with_other_centers` no queda restringit a `editor_profe`/`admin_global` en aquest endpoint.
  - `DELETE` valida centre/admin pero no bloqueja explicitament `editor_alumne` o `display`; depen de RLS per denegar o permetre.
  - Tags i hashtags s'actualitzen amb delete/insert sobre `video_tags` i `video_hashtags`, reforçant el risc del Pas 2 si la policy RLS d'aquestes taules es basa en visibilitat.
- `app/api/playlists`:
  - `POST /api/playlists` bloqueja `editor_alumne` i exigeix `editor_profe`/`admin_global`; crea nomes `custom`.
  - `PATCH`/`DELETE /api/playlists/[id]` bloquegen `editor_alumne` i exigeixen `editor_profe` del centre o `admin_global`.
  - `POST /api/playlists/[id]/videos`, `DELETE /api/playlists/[id]/videos/[videoId]` i `PATCH /api/playlists/[id]/reorder` nomes tracten casos `editor_alumne` i `editor_profe`; no hi ha un bloqueig explicit per `display` o rols desconeguts, de manera que l'error queda delegat a RLS.
  - Els endpoints d'items permeten a `editor_alumne` modificar items si `is_student_editable = true`; no comproven que la playlist sigui de tipus apte per alumnes ni que els videos afegits siguin `published` excepte restriccions parcials per `announcements` i `global`.
  - `POST /api/playlists/[id]/videos` valida que una llista `global` nomes rebi videos compartits, pero no valida `status = published`.
- Usuaris:
  - `app/api/admin/users` i `app/api/admin/users/[id]` exigeixen `admin_global` i usen `service_role` per Auth/updates globals.
  - `app/api/center/users` i subrutes exigeixen `editor_profe`/`admin_global`, mateix centre, i impedeixen quedar sense cap `editor_profe` actiu en canvis/desactivacions.
  - `center/users/[id]` sincronitza `user_metadata.role` quan canvia rol, cosa que pot mantenir metadata d'Auth com a font disponible per fallbacks d'altres endpoints.
- RSS/display/schedule:
  - `rss`, `rss/[id]`, `rss/settings`, `rss/rotation`, `rss/validate`, `rss/[id]/retry`, `display/settings`, `display/ticker` i `schedule-overrides` fan comprovacions de rol per operacions d'escriptura.
  - Encara fan fallback a `user_metadata`, pero prioritzen `public.users`.
  - Alguns GET accepten `centerId` a query i depenen de RLS o del rol admin per limitar resultats; no s'ha vist exposicio clara, pero el patro queda menys explícit que una validacio server-side uniforme.
  - `schedule-overrides/batch-delete` no permet a `admin_global` especificar centre; elimina nomes del `userCenterId`. Sembla limitacio funcional, no risc d'exposicio.
- Vimeo:
  - `POST /api/vimeo/validate` no autentica; valida format i consulta oEmbed public de Vimeo. Es endpoint public intencionable, pero no esta documentat com a public al roadmap.
  - `POST /api/vimeo/upload/ticket` autentica pero no llegeix rol/centre; qualsevol usuari autenticat, inclos `display`, pot crear tickets Tus a Vimeo amb `VIMEO_ACCESS_TOKEN`.
  - `GET /api/vimeo/status/[videoId]` autentica pero no valida rol ni propietat del video; qualsevol usuari autenticat pot consultar l'estat Vimeo d'un `videoId` arbitrari via token server-side.
- Landing i cron:
  - `GET /api/landing/playlist` es public i no autentica; depen de RLS anon per limitar playlist/videos globals, publicats i compartits. La logica de codi busca `kind = 'global'`, no `landing`.
  - `GET /api/cron/fetch-rss` usa `service_role`; nomes comprova `CRON_SECRET` si `NODE_ENV === 'production'` i `CRON_SECRET` existeix. En entorns no produccio queda obert per disseny.

## Conclusions

- Les API routes reforcen una part important del model, especialment admin global, gestio d'usuaris, RSS/display/schedule i notificacions.
- Tot i aixo, no compensen completament els riscos RLS del Pas 2: en videos i items de playlists hi ha endpoints que confien massa en RLS o en comprovacions parcials.
- El punt mes greu es `app/api/videos/[id]/route.ts`: les accions especials de moderacio estan ben delimitades, pero l'edicio normal i l'eliminacio no exigeixen explicitament `editor_profe`/`admin_global`, i a sobre prioritzen `user_metadata` abans que `public.users`.
- El segon bloc de risc es playlists/items: les metadades estan protegides, pero afegir, treure i reordenar items necessita una validacio server-side mes clara per rol, centre, tipus de playlist i estat dels videos.
- El tercer bloc es Vimeo: l'upload ticket i l'estat de processament haurien de validar rols editorials i, idealment, centre/propietat o un flux de pujada iniciat per l'usuari.
- El fallback a `user_metadata` apareix prou sovint per considerar-lo deute transversal d'autoritzacio; segons AGENTS.md, el perfil de `public.users` hauria de ser la font obligatoria per decisions de permisos.
- `service_role` no sembla exposat al client i normalment s'usa despres de comprovacions raonables, pero cal polir casos concrets i auditar rollback/error paths.

## Riscos o dubtes

- Critic/alt: un `editor_alumne` o `display` podria intentar `PATCH`/`DELETE /api/videos/[id]`; la resposta real dependra de RLS i de metadata, pero l'API no aplica la regla de negoci de forma suficient.
- Alt: si `user_metadata` esta desfasada o manipulable per algun flux, endpoints amb fallback poden autoritzar amb dades no canonices.
- Alt: `POST /api/vimeo/upload/ticket` permet consum de quota/token Vimeo a qualsevol usuari autenticat; `display` no hauria de tenir aquesta capacitat.
- Alt: endpoints de playlist items poden permetre afegir videos no publicats a llistes editables per alumnes o globals, si RLS i dades ho permeten.
- Mitja: `GET /api/videos` retorna `total` de la query abans del filtratge extra d'`editor_alumne`, cosa que pot produir paginacio/counts inconsistents i potencial senyal lateral menor.
- Mitja: `POST /api/vimeo/validate` i `POST /api/rss/validate` fan fetch server-side d'URLs externes; RSS valida protocol HTTP(S), Vimeo restringeix format Vimeo. Cal revisar SSRF/rate-limit al Pas 4.
- Mitja: `GET /api/cron/fetch-rss` queda obert fora de produccio si no hi ha secret; cal assegurar que deploy real tingui `NODE_ENV=production` i `CRON_SECRET`.
- Dubte: la landing usa playlist `kind = 'global'` i no `kind = 'landing'`; validar al Pas 5 si es decisio funcional o drift.
- Dubte: alguns endpoints retornen errors en castella/angles o missatges crus de Supabase; revisar consistencia al Pas 6/7 si es prioritza UX.

## Correccions candidates per al pas 7

- Crear un helper server-side compartit tipus `requireProfile()` / `requireRole()` que faci `getUser()`, llegeixi `public.users`, comprovi `is_active`/`onboarding_status` quan pertoqui, i no autoritzi mai amb `user_metadata`.
- Refactoritzar `app/api/videos/[id]/route.ts`:
  - llegir sempre rol/centre des de `public.users` abans de decisions.
  - bloquejar edicio normal i delete a qualsevol rol que no sigui `editor_profe` o `admin_global`, amb excepcio explicita i estreta per `editor_alumne` en `submit_revision`.
  - limitar `is_shared_with_other_centers`, `status`, tags i hashtags a rols permesos.
- Endurir endpoints de playlist items:
  - bloquejar explicitament `display` i rols desconeguts.
  - validar centre de la playlist per tots els rols.
  - per `editor_alumne`, permetre nomes llistes `custom` marcades `is_student_editable` si aquesta es la regla final.
  - validar que els videos afegits siguin `published` i visibles/autoritzats per al cas d'us.
- Restringir `POST /api/vimeo/upload/ticket` i `GET /api/vimeo/status/[videoId]` a `editor_profe`, `editor_alumne` i `admin_global`, amb validacio de flux/propietat quan sigui possible.
- Revisar `POST /api/vimeo/validate` i `POST /api/rss/validate` per autenticacio, rate limiting o restriccions addicionals segons exposicio publica desitjada.
- Corregir el rollback de `app/api/admin/users/route.ts` per usar `supabaseAdmin.auth.admin.deleteUser(...)` si falla la creacio del perfil.
- Revisar `GET /api/videos` per incloure `needs_revision` en rols que l'han de moderar o per documentar-ne l'exclusio.
- Fer que les API de GET amb `centerId` comprovin explicitament rol/centre en comptes de dependre nomes de RLS, especialment display/RSS/ticker/hashtags.

---

# Pas 4. Auth, secrets i exposicio

## Objectiu

Revisar riscos transversals d'autenticacio, gestio de sessions, secrets i exposicio publica.

## Que cal comprovar

- Flux login/logout/reset password/invitacions.
- Us de `@supabase/ssr` i cookies.
- `proxy.ts` i proteccio de rutes.
- Variables d'entorn i possibles secrets exposats.
- Us de `SUPABASE_SERVICE_ROLE_KEY`.
- Us de `VIMEO_ACCESS_TOKEN`.
- Us de `CRON_SECRET`.
- Endpoints publics intencionats i no intencionats.
- Headers o configuracions de seguretat rellevants.

## Evidencies recollides

- Sessio: 2026-07-07, mode nomes lectura sobre codi, configuracio i fitxers d'entorn; unica escriptura feta en aquest document de roadmap.
- Skill Supabase llegida; checklist aplicada especialment a `user_metadata`, claus client/server, `service_role`, RLS com a defensa i funcions exposades.
- Fonts llegides: `AGENTS.md`, `README.md`, `PROJECT_REVIEW_ROADMAP.md`, `proxy.ts`, `utils/supabase/server.ts`, `utils/supabase/client.ts`, `utils/supabase/AuthContext.tsx`, fluxos `app/login`, `app/auth/*`, `app/reset-password/*`, rutes d'usuaris, Vimeo, cron, landing, RSS validate, display config, `next.config.ts`, `vercel.json`, `.gitignore`, `package.json`, `.mcp.json`, `.env.example`, noms/estat de variables a `.env.local` i `.env.vercel`, i `docs/authentication.md`.
- Patrons positius:
  - `utils/supabase/server.ts` i `proxy.ts` usen `createServerClient` de `@supabase/ssr` amb cookies; `utils/supabase/client.ts` usa `createBrowserClient`.
  - Les claus exposades al client son nomes `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_ANON_KEY`; no s'ha trobat `SUPABASE_SERVICE_ROLE_KEY` ni `VIMEO_ACCESS_TOKEN` en codi client.
  - `.gitignore` ignora `.env*` excepte `.env.example`; `git ls-files` no mostra `.env.local`, `.env.vercel`, `.mcp.json` ni `notatemporal.txt` versionats.
  - `next.config.ts` defineix alguns headers de seguretat: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` i `Permissions-Policy` per camera/micro/geolocation.
  - `app/auth/callback/route.ts` valida el parametre `next` per evitar open redirect basic: nomes permet paths relatius que comencin per `/` i no per `//`.
  - `service_role` s'usa en rutes server-side per gestio d'usuaris, RSS retry/ingestion i cron; en la majoria de casos hi ha comprovacions previes de rol/centre o `CRON_SECRET`.
- Variables d'entorn revisades sense exposar valors:
  - `.env.local` te valors reals per `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MAX_VIDEO_SIZE_MB`, `VIMEO_ACCESS_TOKEN` i `DATABASE_URL`.
  - `.env.vercel` te valors reals per `MAX_VIDEO_SIZE_MB`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_OIDC_TOKEN`, `VIMEO_ACCESS_TOKEN` i `DATABASE_URL`.
  - Ni `.env.local` ni `.env.vercel` mostren `CRON_SECRET`, tot i que `README.md`, `AGENTS.md` i `.env.example` el documenten com a necessari.
  - `.env.example` documenta placeholders per Supabase/Vimeo/Cron; el `DATABASE_URL` d'exemple es format directe `db.[project-ref].supabase.co:5432`, mentre `AGENTS.md` recomana pooler IPv4 port `6543`.
- `proxy.ts`:
  - Protegeix `/admin`, `/dashboard`, `/visor`, `/contingut`, `/llistes`, `/rss`, `/usuaris`, `/perfil` i `/pantalla`.
  - Redirigeix usuaris no autenticats en rutes protegides.
  - Per `/admin`, `/pantalla/config` i `/pantalla`, llegeix rol de `user.user_metadata`; si el rol no existeix, no bloqueja per rol.
  - No consulta `public.users` ni `/api/auth/me`, per tant pot divergir de la font canonica de permisos.
- Client/AuthContext:
  - `/api/auth/me` consulta `public.users` i reescriu `role`/`center_id` dins l'objecte `user_metadata` de la resposta.
  - `AuthContext` consumeix `data.user.user_metadata.role` i `center_id`, els desa a `sessionStorage` i força `signOut()` si detecta rol diferent del cache local.
  - Aquesta capa millora UX, pero manté `user_metadata` com a transport principal de rol/centre cap al client.
- Fluxos login/logout/reset/invitacio:
  - Login usa `signInWithPassword` i gestiona conflicte de sessio local; els errors crus de Supabase es mostren directament a l'usuari.
  - Reset password usa `resetPasswordForEmail` amb `redirectTo` basat en `location.origin` cap a `/auth/callback?next=/reset-password/confirm`.
  - `/auth/callback` gestiona `invite`, `recovery` i `code`, fa `verifyOtp`/`exchangeCodeForSession` i activa `onboarding_status` en primer login.
  - `/auth/confirm` fa `verifyOtp(type='invite')`, `updateUser({ password })` i actualitza `onboarding_status = active`.
  - `auth/signout` crida `supabase.auth.signOut()` i neteja alguns noms antics de cookies; la neteja manual pot no cobrir tots els noms actuals de cookies Supabase SSR, pero el `signOut` es la part rellevant.
  - Les contrasenyes nomes exigeixen minim 6 caracters a la UI; no s'ha verificat politica de password al dashboard Supabase.
- Invitacions i `user_metadata`:
  - `admin/users` i `center/users` criden `supabaseAdmin.auth.admin.inviteUserByEmail(email, { data: { role, center_id } })`.
  - `center/users/[id]` sincronitza `user_metadata.role` quan canvia rol; no sincronitza `center_id`.
  - `admin/users/[id]` actualitza `public.users` amb `service_role`, pero no s'ha vist sincronitzacio equivalent d'Auth metadata; això pot deixar metadata desfasada.
  - La documentacio `docs/authentication.md` encara inclou exemples antics que posen rol/centre a metadata i fragments basats en `getSession()`.
- Cron:
  - `vercel.json` programa `/api/cron/fetch-rss` cada dia.
  - `app/api/cron/fetch-rss/route.ts` nomes comprova `Authorization: Bearer ${CRON_SECRET}` si `process.env.NODE_ENV === 'production' && cronSecret`.
  - Si `CRON_SECRET` falta en produccio, el cron queda sense verificacio i executa amb `SUPABASE_SERVICE_ROLE_KEY`.
- Vimeo:
  - `VIMEO_ACCESS_TOKEN` nomes apareix en codi server-side (`lib/vimeo/api.ts`, `api/vimeo/upload/ticket`, `api/vimeo/status`).
  - `POST /api/vimeo/upload/ticket` i `GET /api/vimeo/status/[videoId]` autentiquen usuari pero no validen rol ni propietat/flux, de manera que exposen capacitat server-side del token Vimeo a qualsevol usuari autenticat.
  - `POST /api/vimeo/validate` es public i consulta oEmbed amb URL construida a partir d'un ID Vimeo extret; sembla menys exposat a SSRF que un fetch arbitrari.
- RSS/SSRF:
  - `POST /api/rss/validate` exigeix autenticacio i rol `editor_profe`/`admin_global`, pero accepta qualsevol URL amb protocol que comenci per `http`, incloent potencialment hosts interns o esquemes `http+...` si `new URL` els accepta.
  - El cron i retry llegeixen URLs guardades de feeds amb `rss-parser`; la proteccio depen de qui pot crear feeds i de validacions de URL.
- Exposicio publica intencionada:
  - `GET /api/landing/playlist` es public i depen de RLS anon per limitar playlist/videos globals publicats i compartits.
  - `POST /api/vimeo/validate` es public de facto.
  - Les pagines `/login`, `/reset-password`, `/auth/callback`, `/auth/confirm` i landing publica queden fora del `proxy`, coherent amb el flux.
- Logs i dades sensibles:
  - `app/api/videos/route.ts` fa logs d'email, rol, centre, `user_metadata`, `app_metadata`, user id i dades de creacio de video.
  - `app/api/vimeo/status/[videoId]` loga resposta resumida de Vimeo incloent `link` i hash unlisted.
  - Aquests logs no exposen secrets directament al client, pero poden filtrar dades personals o enllacos unlisted en logs de plataforma.
- Headers/config:
  - No s'ha vist `Content-Security-Policy`, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy` ni `Cross-Origin-Resource-Policy`.
  - `X-DNS-Prefetch-Control` esta a `on`, decisio de rendiment mes que de bloqueig.

## Conclusions

- L'arquitectura basica d'Auth SSR i separacio client/server es correcta: el client public nomes rep URL/anon key, i el `service_role` i `VIMEO_ACCESS_TOKEN` queden en rutes server-side.
- El problema transversal continua sent `user_metadata`: no nomes apareix com a fallback en API routes (Pas 3), sino tambe en `proxy.ts`, `AuthContext`, invitacions i sincronitzacions parcials. Aixo contradiu la regla canonica del projecte i la recomanacio Supabase de no autoritzar amb `raw_user_meta_data`.
- `proxy.ts` no es una defensa de permisos fiable per rol: si el rol falta en metadata, deixa passar; si metadata esta desfasada, pot redirigir o permetre incorrectament. Les API/RLS han de continuar sent la defensa real.
- El cron RSS te un risc alt de configuracio: el codi fa opcional el secret en produccio si `CRON_SECRET` no existeix, i els fitxers d'entorn revisats no el defineixen. Com que el cron usa `service_role`, la comprovacio hauria de ser obligatoria.
- No s'han trobat secrets reals versionats al repo en els fitxers revisats; `.env.local` i `.env.vercel` estan ignorats i no consten a `git ls-files`.
- Els endpoints Vimeo autenticats amplien la superficie del token Vimeo server-side a qualsevol sessio autenticada, ja detectat al Pas 3 i confirmat com a risc de secrets/capacitat.
- La validacio RSS es autenticada i restringida per rol, pero continua sent una superficie SSRF potencial per URLs arbitraries HTTP(S); cal endurir-la si el sistema s'exposa a usuaris no completament confiables.
- Els headers de seguretat basics existeixen, pero falta una politica CSP/HSTS i altres headers moderns si es vol pujar el nivell de hardening.
- Hi ha massa logs de debug amb dades d'usuari, metadata i links/hash Vimeo; son utils durant desenvolupament, pero arriscats en produccio.

## Riscos o dubtes

- Alt: si `CRON_SECRET` falta a Vercel, `/api/cron/fetch-rss` queda executable sense token i amb `service_role`; cal confirmar variables reals del dashboard, no nomes `.env.vercel`.
- Alt: decisions de ruta i UI basades en `user_metadata` poden divergir de `public.users` i crear comportaments incoherents o finestres d'autoritzacio febles.
- Alt: `POST /api/vimeo/upload/ticket` i `GET /api/vimeo/status/[videoId]` permeten consum o consulta via token Vimeo a qualsevol usuari autenticat.
- Mitja/alta: `POST /api/rss/validate` i feeds RSS guardats poden fer fetch server-side a URLs arbitraries; manca allowlist/denylist de xarxes privades, IPs locals i protocols estrictament `http:`/`https:`.
- Mitja: logs de servidor poden exposar correus, ids d'usuari, rol/centre, metadata i links unlisted de Vimeo.
- Mitja: `admin/users/[id]` pot deixar `user_metadata` desfasada per no sincronitzar metadata quan canvia rol/centre, mentre altres capes encara la consulten.
- Mitja: reset/invite/password mostren errors crus de Supabase i nomes validen minim 6 caracters a UI; cal confirmar politiques d'Auth al dashboard.
- Baixa/mitja: falten CSP i HSTS en `next.config.ts`; pot ser acceptable temporalment, pero queda com hardening pendent.
- Dubte: `VERCEL_OIDC_TOKEN` apareix a `.env.vercel`; cal confirmar si es un artefacte local exportat i si hauria de quedar fora de fitxers de treball persistents.
- Dubte: cal decidir si `POST /api/vimeo/validate` ha de continuar public o requerir autenticacio/rate limit.

## Correccions candidates per al pas 7

- Fer obligatori `CRON_SECRET` a `/api/cron/fetch-rss`: si falta, retornar error 500/configuration error; si existeix, exigir sempre `Authorization: Bearer ...` en produccio i entorns desplegats.
- Afegir `CRON_SECRET` a entorns locals/desplegament i verificar configuracio real de Vercel.
- Refactoritzar `proxy.ts` per no autoritzar amb `user_metadata`; opcions: limitar-lo a autenticacio basica i deixar rol a pages/API, o consultar una font server-side canonica amb compte amb cost i cookies.
- Canviar `/api/auth/me` i `AuthContext` per retornar/consumir camps top-level `profile.role` i `profile.center_id`, no `user_metadata` reescrit.
- Deixar d'escriure rol/centre a `user_metadata` en invitacions, o tractar-ho nomes com a compatibilitat temporal no autoritzadora; si cal claim cache, preferir `app_metadata` amb consciencia de frescor JWT.
- Eliminar els fallbacks a `user_metadata` en API routes amb un helper compartit que llegeixi `public.users`.
- Restringir endpoints Vimeo a rols editorials i validar ownership/flux de pujada; considerar rate limiting basic per ticket/status.
- Endurir RSS validate/ingestion amb protocol estrictament `http:`/`https:`, bloqueig de localhost, rangs privats/link-local/meta-data IPs, redirects controlats, mida maxima i timeouts.
- Reduir o condicionar logs sensibles en produccio, especialment metadata d'usuari i links/hash Vimeo.
- Afegir headers de hardening: CSP adaptada a Vimeo/Supabase/assets, HSTS en produccio, i revisar COOP/CORP segons compatibilitat.
- Revisar `docs/authentication.md` per eliminar exemples basats en `getSession()` i metadata autoritzadora, i alinear-lo amb la regla `public.users` com a font canonica.
- Revisar fluxos de reset/invite per missatges d'error en catala i confirmar politica de contrasenyes al dashboard Supabase.

---

# Pas 5. Fluxos critics de negoci

## Objectiu

Validar els fluxos principals del producte des del punt de vista funcional i de seguretat.

## Fluxos a revisar

- Creacio i invitacio d'usuaris.
- Canvi de rol o centre d'un usuari.
- Alta de video per URL Vimeo.
- Pujada directa de video a Vimeo.
- Video d'alumne pendent d'aprovacio.
- Aprovacio, rebuig i peticio de revisio.
- Comparticio de videos entre centres.
- Tags i hashtags.
- Gestio de playlists.
- Playlist global i landing publica.
- Mode display/pantalla.
- RSS i cron d'actualitzacio.
- Notificacions.

## Que cal comprovar

- Que cada flux te validacio a UI, API i BD quan cal.
- Que els estats no poden quedar incoherents.
- Que els errors importants es gestionen be.
- Que no hi ha regressions evidents entre documentacio i implementacio.

## Evidencies recollides

- Sessio: 2026-07-07, mode auditoria nomes lectura sobre codi, documentacio i BD real; unica escriptura feta en aquest document de roadmap.
- Fonts llegides: `docs/overview.md`, `docs/domain-model.md`, `docs/roles.md`, `docs/moderation-system.md`, `docs/ui/llistes.md`, `docs/storage.md`, components i API de videos, playlists, calendari, display, RSS, notificacions i usuaris.
- Flux usuaris/invitacions:
  - `admin/users` i `center/users` creen usuaris via `inviteUserByEmail` amb `service_role` despres de comprovar rol.
  - `center/users/[id]` protegeix canvis de rol/desactivacio per no deixar el centre amb 0 `editor_profe` actius.
  - `admin/users/[id]` permet a `admin_global` canviar rol, centre i estat amb `service_role`, pero no aplica la mateixa regla de "minim un editor_profe actiu" per centre.
  - Dada real: hi ha un centre actiu sense cap `editor_profe` actiu: `Escola PIA d'IGUALADA`.
- Flux alta de video:
  - `VideoFormModal` exigeix titol, almenys un tag, i espera pujada/processament Vimeo abans de crear.
  - La UI ja no mostra entrada manual de URL Vimeo en alta normal; el flux principal es pujada directa via `VideoUploader`.
  - `VideoUploader` valida MIME i mida a client amb maxim fix de 2GB, mentre l'API usa `MAX_VIDEO_SIZE_MB`; pot haver-hi drift si la variable canvia.
  - `POST /api/videos` exigeix rol `editor_profe`, `admin_global` o `editor_alumne`, centre resolt i almenys un tag.
  - `editor_alumne` crea videos `pending_approval` i no pot compartir; `editor_profe`/`admin_global` creen `published` i poden compartir.
  - Dada real: no hi ha videos sense tags; no hi ha videos compartits amb estat diferent de `published`.
- Flux pujada directa Vimeo:
  - Ticket Tus es crea a `/api/vimeo/upload/ticket`; status es consulta a `/api/vimeo/status/[videoId]`.
  - El formulari no deixa desar fins que `is_playable` i `has_real_thumbnail` son certs.
  - Es conserva `vimeo_hash` per videos unlisted quan Vimeo retorna link amb hash.
  - L'extraccio de fotogrames puja a Storage bucket `announcement-frames` des del client i no bloqueja el flux.
  - BD real: existeix bucket `announcement-frames`, public, limit 5MB i MIME `image/jpeg`, `image/png`, `image/webp`; no hi ha policies a `storage.objects`.
- Flux moderacio:
  - `editor_profe` pot aprovar (`status='published'`), rebutjar via `DELETE`, o demanar revisio (`action='request_revision'`) amb comentari minim de 10 caracters.
  - `editor_alumne` pot corregir videos propis en `needs_revision` via `action='submit_revision'`; pot actualitzar metadades/tags/hashtags i opcionalment substituir el video Vimeo.
  - API valida estat i propietari en `submit_revision`, i estat `pending_approval` en `request_revision`.
  - Documentacio `docs/moderation-system.md` encara descriu model antic `pending -> published/rejected` i no incorpora correctament `needs_revision` com a estat viu.
  - Dada real: 16 videos `needs_revision`, tots pujats per `editor_alumne`; 4 videos `pending_approval`.
  - Dada real: 0 notificacions de tipus `video_needs_revision`, tot i que hi ha 16 videos en revisio; no existeix constraint visible de tipus a `notifications`.
- Flux edicio/eliminacio de videos:
  - UI amaga edicio normal a `editor_alumne` excepte botó "Corregir" en `needs_revision`.
  - `PATCH /api/videos/[id]` i `DELETE /api/videos/[id]` continuen prioritzant `user_metadata` i no bloquegen explicitament `display`/`editor_alumne` en l'edicio normal o delete; depenen de RLS en part.
  - En edicio normal, `status` nomes canvia si `finalRole === 'editor_profe'`, pero `is_shared_with_other_centers`, tags i hashtags no tenen tall explicit de rol editorial.
- Flux comparticio/tags/hashtags:
  - UI nomes mostra el checkbox de comparticio a `editor_profe`/`admin_global`.
  - `POST /api/videos` impedeix compartir a alumnes.
  - Dada real: tots els videos compartits son `published`.
  - Dada real: les playlists globals actives no contenen items no publicats ni no compartits.
- Flux playlists:
  - UI permet crear llistes nomes a `editor_profe`/`admin_global`; API tambe bloqueja `editor_alumne` en crear, editar metadades i eliminar.
  - Afegir videos a llistes usa `AddVideosModal`, que demana `status=published`, `includeShared=true` i filtra tipus `announcement` quan toca.
  - API reforça que `announcements` nomes accepti videos `type='announcement'`.
  - API reforça que `global` nomes accepti videos compartits, pero no valida explicitament `status='published'`; ara mateix les dades reals no tenen items globals invalids.
  - `editor_alumne` pot afegir, treure i reordenar si `is_student_editable=true`, sense limitar-ho a `custom`, sense validar propietat del video, i sense bloquejar `announcements`/`weekday` quan el flag esta activat.
  - UI permet togglar `is_student_editable` a qualsevol playlist visible per `editor_profe`/`admin_global`; no restringeix a `custom`.
  - Dada real: playlists actives `is_student_editable=true`: `weekday=6`, `announcements=2`, `custom=1`. Això contradiu `docs/domain-model.md` i parcialment `docs/ui/llistes.md`.
  - Dada real: no hi ha items no publicats en playlists actives, ni videos no anunci en llistes `announcements`.
- Flux calendari:
  - UI mostra calendari nomes en playlists `custom` amb `center_id` i rols `editor_profe`/`admin_global`.
  - API `schedule-overrides` valida rol, centre i dates no passades, i fa upsert per `center_id,date`.
  - API no valida explicitament que la playlist programada sigui de tipus `custom` o copia local global, ni que pertanyi a un conjunt de tipus programables mes enlla de centre/rol.
  - Dada real: tots els `schedule_overrides` apunten a playlists actives, mateix centre i tipus `custom`.
- Flux landing publica:
  - `GET /api/landing/playlist` es public i busca `kind='global'`, `center_id IS NULL`, `is_active=true`.
  - RLS anon limita items/videos a globals actius, `published` i compartits segons Pas 2.
  - Documentacio de domini parla de `kind='landing'`, pero BD real nomes te una llista `global` amb `center_id IS NULL`; no hi ha playlist `landing`.
- Flux display/pantalla:
  - `app/pantalla/page.tsx` comprova `public.users` i permet `display`, `editor_profe`, `editor_alumne`, `admin_global` amb centre.
  - `display/config` resol llista actual per `schedule_overrides`, weekday i fallback de cap de setmana a divendres; tambe carrega anuncis i settings RSS/display.
  - `display/playlist/[id]` filtra nomes videos `published` i amb `vimeo_id`.
  - Alguns endpoints display/ticker permeten lectura amb `centerId` de query i confien en RLS per limitar files quan no hi ha validacio explicita de rol/centre.
- Flux RSS/cron:
  - UI restringeix `/rss` a `editor_profe`/`admin_global`.
  - API RSS valida rol per crear/editar/eliminar feeds i settings/rotacio.
  - Crear/editar feed valida i parseja la URL abans de guardar, i fa fetch inicial d'items amb `service_role`.
  - Rotacio valida que tots els feeds pertanyin al centre abans de reemplaçar l'ordre.
  - Cron processa feeds actius amb `error_count < 5`, upserta fins a 50 items i desactiva feeds quan arriben a 5 errors.
  - Dada real: hi ha 1 feed inactiu amb `is_in_rotation=true` i una entrada de `rss_rotation_order` apuntant a feed inactiu; no hi ha feed missing ni cross-center.
- Flux notificacions:
  - API `notifications` llista, marca llegida i elimina nomes notificacions de l'usuari autenticat.
  - No s'ha vist UI completa de dropdown/notificacions; la sidebar usa comptadors directes de videos pendents/revisio, no notificacions.
  - Dada real: notificacions per tipus: `video_pending=1380`, `video_approved=368`, `video_rejected=48`; totes consten `unread`.
  - Dada real: no hi ha notificacions amb `video_id` orfe.
- Flux convidats temporals:
  - `guest_access_links` existeix a BD pero te 0 files i no s'ha trobat UI/API funcional actual; segueix com a funcionalitat futura/no implementada.

## Conclusions

- Els fluxos principals estan implementats i molts invariants importants es compleixen en dades reals: videos tenen tags, els compartits son publicats, playlists actives no contenen videos pendents, llistes d'anuncis no contenen contingut normal, i schedule apunta a llistes actives del mateix centre.
- La UI guia correctament gran part dels rols, pero la seguretat funcional continua depenent massa de RLS en videos i playlist items; els punts detectats als passos 2-4 es confirmen en fluxos reals.
- El flux de moderacio ha evolucionat cap a `needs_revision`, pero la documentacio principal de moderacio i el sistema de notificacions no estan completament alineats amb aquest estat.
- Playlists es el flux amb mes drift de domini: `is_student_editable` esta activat en `weekday` i `announcements`, i tant UI com API permeten que això tingui efectes reals per alumnes.
- Landing publica funciona sobre `kind='global'`, no `kind='landing'`; pot ser una decisio pragmatica, pero contradiu part del model de domini i documentacio UI/admin.
- RSS es funcional i força complet, pero queda deute en seguretat de fetch URL, secret de cron i neteja de rotacio quan un feed es desactiva per errors.
- Display filtra videos publicats en el punt de reproduccio, cosa positiva; els riscos principals son de validacio explicita de centre en endpoints auxiliars i coherencia de playlist override.
- Storage per `announcement-frames` esta a mig cami: bucket real present, pero sense policies; com que el codi falla silenciosament, pot no trencar el flux principal pero deixa una funcionalitat secundària inoperant o dependent de configuracio externa no documentada.
- Gestio d'usuaris de centre protegeix millor la invariant d'almenys un professor que la gestio admin global; les dades reals ja mostren un centre actiu sense professor actiu.

## Riscos o dubtes

- Alt: `editor_alumne` pot editar items de playlists `weekday` i `announcements` si el flag esta activat; a la BD real hi ha 8 llistes d'aquests tipus amb `is_student_editable=true`.
- Alt: `PATCH`/`DELETE /api/videos/[id]` no imposen explicitament la regla de negoci per rol en edicio normal/eliminacio, i poden permetre canvis si RLS queda massa ampla.
- Alt: centre actiu sense `editor_profe` actiu pot quedar sense capacitat local de moderacio/gestio; ja existeix `Escola PIA d'IGUALADA`.
- Mitja/alta: videos `needs_revision` no tenen notificacions `video_needs_revision`; els alumnes depenen del banner/comptador de contingut, no d'una safata de notificacions.
- Mitja/alta: `announcement-frames` no te policies Storage; la pujada client-side de fotogrames probablement falla silenciosament i la documentacio no cobreix aquest bucket.
- Mitja: `schedule-overrides` no valida tipus de playlist a API; avui les dades son netes, pero clients directes podrien programar tipus no desitjats si RLS ho permet.
- Mitja: RSS pot deixar feeds inactius en rotacio; ja hi ha 1 cas real.
- Mitja: totes les notificacions existents consten com no llegides, cosa que suggereix que la UI de notificacions no esta integrada o no s'utilitza.
- Mitja: diferencies documentals sobre landing `global` vs `landing` poden portar a migracions o UI futures incompatibles.
- Dubte: si `editor_alumne` ha de poder reordenar qualsevol item d'una llista editable o nomes afegir/treure videos propis, ja que `docs/roles.md`, `docs/domain-model.md` i `docs/ui/llistes.md` no son completament identics.
- Dubte: si el bucket `announcement-frames` ha estat configurat manualment al dashboard amb algun mecanisme no visible a migracions; la BD mostra 0 policies.

## Correccions candidates per al pas 7

- Endurir `PATCH`/`DELETE /api/videos/[id]` amb rol/centre de `public.users` i bloqueig explicit de `display`/`editor_alumne` fora de `submit_revision`.
- Corregir dades i API/UI de playlists:
  - posar `is_student_editable=false` per `announcements`, `global`, `landing` i probablement `weekday` si aquesta es la decisio final.
  - impedir togglar `is_student_editable` en tipus no permesos.
  - limitar accions d'alumne a llistes i videos permesos, amb validacio de `published`, tipus, propietat si aplica i centre.
- Afegir validacio server-side de `status='published'` en items de playlists globals i altres llistes de reproduccio.
- Afegir validacio de tipus en `schedule-overrides` per acceptar nomes playlists programables.
- Revisar i corregir el centre actiu sense `editor_profe` actiu; afegir proteccio equivalent en endpoints admin globals.
- Alinear notificacions amb `needs_revision`: confirmar trigger real, tipus permesos, UI/lectura, i crear o regenerar notificacions si cal.
- Decidir landing `kind='global'` vs `kind='landing'` i actualitzar codi/docs/schema en una sola direccio.
- Afegir migracio/documentacio per bucket `announcement-frames` i policies de Storage necessaries per uploads client-side segurs, o moure la pujada a endpoint server-side amb `service_role`.
- Netejar `rss_rotation_order` quan un feed es desactiva per errors i reforçar que feeds inactius no quedin en rotacio.
- Endurir RSS URL validation i cron secret segons Pas 4.
- Actualitzar `docs/moderation-system.md`, `docs/ui/llistes.md`, `docs/domain-model.md`, `docs/rss-system.md` i docs Storage amb l'estat real.

---

# Pas 6. Documentacio final i estat real del projecte

## Objectiu

Actualitzar la visio global del projecte amb el que s'ha verificat realment als passos 1 a 5.

## Documents candidats a actualitzar

- `AGENTS.md`
- `README.md`
- `docs/DB-AUDIT-REPORT.md` o nou informe datat
- `docs/model-data.md`
- `docs/roles.md`
- `docs/rss-system.md`
- `docs/vimeo-integration.md`
- documents UI si s'han detectat divergencies

## Que cal produir

- Resum d'estat real.
- Diferencies detectades entre docs i implementacio.
- Decisions de documentacio.
- Llista de documents que queden obsolets o duplicats.

## Evidencies recollides

- Sessio: 2026-07-07, consolidacio documental del que ja s'ha auditat als passos 1-5; no s'han aplicat correccions de codi ni de BD en aquest pas.
- Fonts revisades per aquest tancament: `AGENTS.md`, `README.md`, `PROJECT_REVIEW_ROADMAP.md`, llista de fitxers dins `docs/` i mostra inicial de `docs/DB-AUDIT-REPORT.md`.
- El mateix roadmap ja conte una foto detallada i accionable de l'estat real de BD, RLS, API, auth/secrets i fluxos critics. Per tant, el Pas 6 no necessita reauditar, sino ordenar que s'ha de documentar ara i que s'ha d'ajornar fins al Pas 7.
- `AGENTS.md` i `README.md` estan raonablement alineats amb l'estat funcional general i amb les regles operatives principals: `public.users` com a font d'autoritzacio, Supabase com a backend, Vimeo/Tus, RSS, display, landing global i verificacions `lint`/`build`.
- `docs/DB-AUDIT-REPORT.md` es clarament historic/desfasat: data 2026-01-19, parla de 18 migracions i un estat general correcte que no reflecteix les 20 taules publiques, els canvis RSS/display/moderacio, les migracions manuals no registrades ni els riscos RLS/API trobats.
- `docs/database.schema.md` i `docs/model-data.md` no son equivalents a una foto exacta de la BD real: barregen estat real, recomanacions, estadistiques antigues i camps futurs o inexistents.
- Documents funcionals amb divergencies detectades:
  - `docs/moderation-system.md`: no descriu prou be l'estat viu `needs_revision` ni les notificacions associades.
  - `docs/domain-model.md` i `docs/ui/llistes.md`: no estan del tot alineats amb el comportament real de `is_student_editable`, especialment en llistes `weekday` i `announcements`.
  - `docs/rss-system.md`: no recull prou els riscos detectats de cron secret, validacio URL, feeds inactius en rotacio i estat real de dades.
  - `docs/storage.md`: no deixa prou documentat el bucket `announcement-frames` ni les policies inexistents de Storage.
  - `docs/authentication.md`: s'ha de revisar per eliminar o matisar patrons basats en `user_metadata` com a font d'autoritzacio.
  - Docs de landing/global: hi ha divergencia entre el concepte `kind='landing'` i la implementacio real basada en `kind='global'`.
- Documents historics o de milestone (`docs/milestones/*`, `docs/README-historic.md`, `docs/DB_REVIEW_2026-01-12.md`) poden conservar-se com a historial, pero no haurien de ser fonts operatives principals si contradiuen `AGENTS.md`, `README.md`, `PROJECT_REVIEW_ROADMAP.md` o una auditoria nova de BD.
- Estat del worktree abans del Pas 6: ja hi havia canvis locals i fitxers no versionats no relacionats directament amb aquesta edicio; s'han respectat i no s'han revertit.

## Conclusions

- El Pas 6 s'ha de considerar una consolidacio, no una fase de reescriptura massiva. El projecte ja te prou evidencia acumulada per passar al Pas 7.
- La font viva de continuitat ha de ser `PROJECT_REVIEW_ROADMAP.md` fins que s'apliquin correccions. Actualitzar massa documents funcionals abans del Pas 7 podria fixar com a "comportament correcte" alguns bugs o decisions encara obertes.
- La documentacio mes urgent a corregir es la de BD: cal crear un informe nou datat o substituir `docs/DB-AUDIT-REPORT.md` amb una foto real posterior a l'auditoria de 2026-07-07.
- `AGENTS.md` i `README.md` no requereixen una reescriptura immediata. Els ajustos que necessitin haurien de fer-se despres de decidir/aplicar les correccions principals del Pas 7.
- Les divergencies documentals principals no son purament editorials: reflecteixen decisions de producte i seguretat encara obertes, especialment permisos de rols, playlists editables per alumnes, landing `global` vs `landing`, notificacions `needs_revision`, Storage i cron/RSS.
- Cal classificar els documents en tres grups:
  - Fonts operatives actuals: `AGENTS.md`, `README.md`, `PROJECT_REVIEW_ROADMAP.md`.
  - Documents a actualitzar despres de correccions: `docs/roles.md`, `docs/domain-model.md`, `docs/moderation-system.md`, `docs/ui/llistes.md`, `docs/rss-system.md`, `docs/storage.md`, `docs/authentication.md`.
  - Documents historics o obsolets: `docs/DB-AUDIT-REPORT.md` actual, `docs/DB_REVIEW_2026-01-12.md`, `docs/README-historic.md` i milestones antics quan contradiguin l'estat real.
- El Pas 7 hauria de comencar prioritzant riscos de seguretat/permisos i dades incoherents; la documentacio final estable hauria de venir despres de cada correccio o bloc de correccions.

## Riscos o dubtes

- Risc de documentar massa aviat: si es reescriuen `roles`, `domain-model` o UI abans del Pas 7, es poden normalitzar comportaments que probablement s'han de corregir.
- Risc de font equivocada: `docs/DB-AUDIT-REPORT.md` encara sembla un informe d'auditoria vigent, pero les dades i conclusions ja no son fiables com a estat real.
- Dubte pendent: decidir si `docs/database.schema.md` ha de ser una referencia exacta d'esquema real o un document mixt de model/recomanacions. Ara mateix la barreja pot confondre.
- Dubte pendent: decidir si cal mantenir un sol informe de BD sempre actualitzat o informes datats successius. Per traçabilitat, sembla millor crear un informe nou datat i marcar l'antic com a historic.
- Dubte pendent: decidir si `guest_access_links` i `audit_logs` s'han de documentar com a funcionalitats futures tancades per RLS o activar-les amb policies i UI/API.
- Dubte pendent: decidir si la landing s'ha d'estandarditzar documentalment com a playlist `global` o migrar/corregir cap a `landing`.
- Dubte pendent: decidir l'abast exacte de les llistes editables per alumnes abans de corregir docs i dades.

## Correccions candidates per al pas 7

- Preparar una matriu de correccions prioritzada amb categories `Critic`, `Alt`, `Mitja`, `Baixa`, reutilitzant les candidates dels passos 1-5.
- Crear o actualitzar un informe de BD real datat 2026-07-07, amb:
  - 20 taules publiques reals, enums, funcions, triggers, policies i extensions.
  - estat de RLS i taules sense policies (`audit_logs`, `guest_access_links`).
  - migracions locals aplicades manualment pero no registrades a `supabase_migrations.schema_migrations`.
  - avis explicit que l'informe antic de 2026-01-19 queda historic.
- Despres de corregir permisos/codi, actualitzar `docs/roles.md`, `docs/domain-model.md` i `docs/ui/llistes.md` amb la decisio final sobre `editor_alumne` i `is_student_editable`.
- Despres de corregir o decidir moderacio/notificacions, actualitzar `docs/moderation-system.md` amb `needs_revision`, `video_needs_revision`, triggers i UI real.
- Despres de corregir RSS/cron, actualitzar `docs/rss-system.md` amb requisits de `CRON_SECRET`, validacio URL i neteja de rotacio.
- Despres de corregir Storage, actualitzar `docs/storage.md` amb bucket `announcement-frames`, ownership, mida/MIME i policies o endpoint server-side.
- Despres de corregir auth/API, actualitzar `docs/authentication.md` per deixar clar que `user_metadata` no autoritza i que `public.users` es la font canonica.
- Decidir i documentar una sola terminologia per la landing publica: playlist global actual o `kind='landing'` si es decideix migrar.
- Afegir notes curtes d'obsolescencia als documents historics que puguin induir a error, especialment `docs/DB-AUDIT-REPORT.md`, si no se substitueixen immediatament.

---

# Pas 7. Pla de correccions i aplicacio controlada

## Objectiu

Convertir les conclusions dels passos 1 a 6 en un pla d'accio prioritzat i aplicar les correccions amb control.

## Categories de prioritat

- Critic: exposicio de dades, escalada de privilegis, secrets, ruptura greu de tenant isolation.
- Alt: incoherencies de permisos, endpoints insegurs, fluxos que poden corrompre dades.
- Mitja: bugs funcionals, documentacio enganyosa, validacions incompletes.
- Baixa: millores, neteges, optimitzacions i deute tecnic no urgent.

## Que cal definir per cada correccio

- Problema.
- Evidencia.
- Impacte.
- Fitxers o taules afectades.
- Proposta de solucio.
- Necessita migracio SQL?
- Necessita canvi de codi?
- Necessita actualitzar docs?
- Verificacio prevista.
- Estat: pendent / en curs / aplicat / descartat.

## Correccions proposades

### C01 - Endurir `PATCH`/`DELETE /api/videos/[id]`

- Prioritat: Alt.
- Problema: l'endpoint prioritzava `user_metadata` i l'edicio/eliminacio normal no bloquejava explicitament `editor_alumne` ni `display`.
- Evidencia: passos 3 i 5; fitxer `app/api/videos/[id]/route.ts`.
- Impacte: possible escalada funcional si RLS o metadata deixen passar l'accio.
- Proposta: llegir sempre rol/centre de `public.users`, retornar 403 si no hi ha perfil i permetre edicio/eliminacio normal nomes a `editor_profe`/`admin_global`.
- Necessita migracio SQL: no per la primera capa; si per tancar RLS en profunditat.
- Necessita canvi de codi: si.
- Necessita docs: si, quan es tanqui RLS.
- Verificacio prevista: lint dirigit i, en fase posterior, proves manuals/API per rols.
- Estat: aplicat en codi; pendent RLS i prova funcional amb sessions reals.

### C02 - Restringir endpoints Vimeo server-side

- Prioritat: Alt.
- Problema: qualsevol usuari autenticat podia crear tickets Tus o consultar status amb el token Vimeo server-side.
- Evidencia: Pas 3 i Pas 5; `app/api/vimeo/upload/ticket/route.ts` i `app/api/vimeo/status/[videoId]/route.ts`.
- Impacte: consum indegut de quota/API Vimeo i exposicio indirecta de fluxos de pujada.
- Proposta: validar rol des de `public.users`, permetent nomes `admin_global`, `editor_profe` i `editor_alumne`; comprovar que `VIMEO_ACCESS_TOKEN` existeix; reduir logs sensibles.
- Necessita migracio SQL: no.
- Necessita canvi de codi: si.
- Necessita docs: nomes nota de seguretat si s'actualitza `docs/vimeo-integration.md`.
- Verificacio prevista: lint dirigit; prova manual de 401/403/200 quan hi hagi sessions.
- Estat: aplicat en codi; pendent prova funcional.

### C03 - Fer obligatori `CRON_SECRET` fora de local

- Prioritat: Alt.
- Problema: el cron RSS quedava obert si no era produccio o si el secret no existia.
- Evidencia: Pas 4 i Pas 5; `.env.local` i `.env.vercel` revisats sense `CRON_SECRET`.
- Impacte: qualsevol actor amb URL podria disparar fetch RSS amb `service_role` en entorns desplegats mal configurats.
- Proposta: permetre execucio sense secret nomes en `NODE_ENV=development`; en qualsevol altre entorn retornar 500 si falta secret i 401 si el bearer no coincideix.
- Necessita migracio SQL: no.
- Necessita canvi de codi: si.
- Necessita docs/env: si.
- Verificacio prevista: lint dirigit; prova manual amb i sense header.
- Estat: aplicat en codi; pendent configurar secrets reals.

### C04 - Substituir policies RLS massa amples de `videos`

- Prioritat: Critic/Alt.
- Problema: la policy antiga `Users can manage videos in their center` dona `ALL` sobre videos del centre a rols que no haurien d'editar.
- Evidencia: Pas 2.
- Impacte: la BD pot permetre escriptures que l'API ja comenca a bloquejar.
- Proposta: crear migracio RLS per separar `SELECT`, `INSERT`, `UPDATE`, `DELETE` per rol i estat; `editor_alumne` nomes crea propis pendents i actualitza propis en `needs_revision`.
- Necessita migracio SQL: si.
- Necessita canvi de codi: possiblement ajustos menors.
- Necessita docs: si.
- Verificacio prevista: simulacions `SET ROLE authenticated` amb JWT claims i consultes d'escriptura controlades.
- Estat: migracio creada i validada en dry-run; pendent aplicar manualment al SQL Editor.

### C05 - Tancar RLS de `users`, `video_tags` i `video_hashtags`

- Prioritat: Alt.
- Problema: `users` permet update propi massa ampli; taules pivot de tags/hashtags es basen en visibilitat del video i no en capacitat de gestio.
- Evidencia: Pas 2.
- Impacte: canvis directes via Data API podrien trencar rols/perfils o metadades de videos.
- Proposta: policies per operacio, `WITH CHECK`, restriccio de rols i, si cal, operacions via API/service_role.
- Necessita migracio SQL: si.
- Necessita canvi de codi: potser.
- Necessita docs: si.
- Verificacio prevista: simulacions RLS per rols.
- Estat: migracio creada i validada en dry-run; pendent aplicar manualment al SQL Editor.

### C06 - Corregir playlists editables per alumnes

- Prioritat: Alt.
- Problema: `editor_alumne` pot gestionar mes del previst quan `is_student_editable=true`, incloent llistes `weekday` i `announcements`.
- Evidencia: Passos 2 i 5; dades reals amb `weekday=6` i `announcements=2` editables per alumnes.
- Impacte: alumnes podrien alterar programacio o anuncis no previstos.
- Proposta: decidir tipus permesos, corregir dades, bloquejar toggle UI/API per tipus no permesos i ajustar RLS/API d'items.
- Necessita migracio SQL: si, per dades/RLS/constraints si s'escau.
- Necessita canvi de codi: si.
- Necessita docs: si.
- Verificacio prevista: proves d'afegir, treure i reordenar items per rol.
- Estat: pendent.

### C07 - Validar items de playlists i schedule server-side

- Prioritat: Mitja/Alta.
- Problema: alguns endpoints confien parcialment en UI/RLS i no validen sempre `published`, tipus de video o tipus de playlist programable.
- Evidencia: Pas 3 i Pas 5.
- Impacte: clients directes poden introduir items incoherents.
- Proposta: validar `published` a playlist items, `announcement` en anuncis, compartit/publicat en globals i tipus `custom` o equivalents en schedule.
- Necessita migracio SQL: no inicialment; si per constraints futures.
- Necessita canvi de codi: si.
- Necessita docs: si.
- Verificacio prevista: proves API negatives i positives.
- Estat: pendent.

### C08 - Eliminar fallbacks autoritzadors a `user_metadata`

- Prioritat: Alt.
- Problema: moltes API routes, `proxy.ts` i `AuthContext` encara usen `user_metadata` com a fallback.
- Evidencia: Pas 3, Pas 4 i cerca transversal.
- Impacte: decisions d'autoritzacio poden dependre de claims no canonics o desfasats.
- Proposta: helper compartit server-side per perfil de `public.users`; client pot rebre rol hidratat per `/api/auth/me`, pero no autoritzar operacions critiques.
- Necessita migracio SQL: no.
- Necessita canvi de codi: si.
- Necessita docs: si.
- Verificacio prevista: lint/build i proves d'accessos per rol.
- Estat: parcialment iniciat a `app/api/videos/[id]/route.ts`; pendent transversal.

### C09 - Reduir logs sensibles

- Prioritat: Mitja/Alta.
- Problema: logs de videos/Vimeo mostren metadata i dades sensibles o identificatives.
- Evidencia: Pas 4.
- Impacte: filtracio en logs de servidor.
- Proposta: eliminar logs de metadata, email, link/hash Vimeo i deixar logs resumits per status/error.
- Necessita migracio SQL: no.
- Necessita canvi de codi: si.
- Necessita docs: no imprescindible.
- Verificacio prevista: cerca `console.log`/`console.error` en rutes sensibles.
- Estat: parcialment aplicat a Vimeo status; pendent videos.

### C10 - Actualitzar auditoria i docs de BD

- Prioritat: Mitja/Alta.
- Problema: `docs/DB-AUDIT-REPORT.md` i docs d'esquema no reflecteixen la BD real.
- Evidencia: Pas 1 i Pas 6.
- Impacte: agents/mantenidors poden prendre decisions sobre informacio falsa.
- Proposta: crear informe datat 2026-07-07 i marcar l'antic com a historic.
- Necessita migracio SQL: no.
- Necessita canvi de codi: no.
- Necessita docs: si.
- Verificacio prevista: revisio creuada amb queries del Pas 1.
- Estat: pendent.

### C11 - Storage `announcement-frames`

- Prioritat: Mitja/Alta.
- Problema: bucket existent pero sense policies visibles de Storage.
- Evidencia: Pas 5.
- Impacte: uploads client-side poden fallar o dependre de configuracio manual no documentada.
- Proposta: decidir policies segures o moure upload a endpoint server-side.
- Necessita migracio SQL: si si es creen policies.
- Necessita canvi de codi: potser.
- Necessita docs: si.
- Verificacio prevista: prova upload/delete per rol.
- Estat: pendent.

### C12 - Notificacions `needs_revision`

- Prioritat: Mitja.
- Problema: hi ha videos `needs_revision` pero 0 notificacions `video_needs_revision`.
- Evidencia: Pas 5.
- Impacte: alumnes poden no rebre avisos per corregir videos.
- Proposta: revisar trigger, tipus de notificacio i UI; backfill si cal.
- Necessita migracio SQL: possible.
- Necessita canvi de codi: possible.
- Necessita docs: si.
- Verificacio prevista: canviar estat de video en entorn controlat i comprovar notificacio.
- Estat: pendent.

### C13 - Centre actiu sense `editor_profe`

- Prioritat: Mitja/Alta.
- Problema: `Escola PIA d'IGUALADA` no te cap professor actiu.
- Evidencia: Pas 5.
- Impacte: centre sense capacitat local de moderacio/gestio.
- Proposta: corregir dada real i aplicar proteccio equivalent a endpoints admin globals.
- Necessita migracio SQL: no, excepte correccio manual de dades.
- Necessita canvi de codi: si.
- Necessita docs: no imprescindible.
- Verificacio prevista: query de centres sense professor actiu.
- Estat: pendent.

### C14 - RSS URL validation i rotacio

- Prioritat: Mitja.
- Problema: validacio URL RSS no bloqueja completament SSRF i hi ha feed inactiu encara en rotacio.
- Evidencia: Pas 4 i Pas 5.
- Impacte: risc SSRF i configuracio incoherent de display RSS.
- Proposta: bloquejar localhost/IP privades/link-local, controlar redirects, timeouts/mida, i netejar rotacio en desactivar feeds.
- Necessita migracio SQL: possible per neteja de dades.
- Necessita canvi de codi: si.
- Necessita docs: si.
- Verificacio prevista: proves amb URLs rebutjades i feed desactivat.
- Estat: pendent.

### C15 - Landing `global` vs `landing`

- Prioritat: Baixa/Mitja.
- Problema: documentacio i enum parlen de `landing`, implementacio real usa `global`.
- Evidencia: Pas 5 i Pas 6.
- Impacte: confusio en evolucions futures.
- Proposta: decidir una sola direccio i alinear codi/docs/dades.
- Necessita migracio SQL: nomes si es migra a `landing`.
- Necessita canvi de codi: possible.
- Necessita docs: si.
- Verificacio prevista: endpoint public `/api/landing/playlist`.
- Estat: pendent.

## Correccions aplicades

- 2026-07-07 - Primera tongada de codi aplicada:
  - `app/api/videos/[id]/route.ts`: `PATCH` i `DELETE` deixen de prioritzar `user_metadata`, llegeixen perfil de `public.users`, retornen 403 si no hi ha perfil i bloquegen edicio/eliminacio normal a rols no editors. Tambe s'han tipat els payloads locals per evitar nous `any`.
  - `app/api/vimeo/upload/ticket/route.ts`: es valida rol de `public.users`, es bloqueja `display` i rols no editorials, i es comprova que `VIMEO_ACCESS_TOKEN` existeix abans de cridar Vimeo.
  - `app/api/vimeo/status/[videoId]/route.ts`: es valida rol de `public.users`, es comprova token Vimeo i s'ha eliminat el log de link/hash/resposta de Vimeo.
  - `app/api/cron/fetch-rss/route.ts`: `CRON_SECRET` passa a ser obligatori en entorns no locals; en local nomes es permet execucio sense secret si `NODE_ENV=development` i el secret no esta definit.
  - No s'ha tocat encara la BD real ni s'han creat/aplicat migracions RLS en aquesta tongada.
- 2026-07-07 - Migracio RLS critica creada:
  - `supabase/migrations/20260707180000_harden_core_rls_policies.sql` substitueix policies massa amples de `videos`, limita UPDATE directe de `users` a `full_name` i `phone`, i separa lectura/escriptura de `video_tags` i `video_hashtags`.
  - La migracio s'ha validat contra la BD real dins una transaccio amb `ROLLBACK`; no s'ha aplicat cap canvi persistent a Supabase.

## Verificacions finals

- `npx eslint --no-ignore "app/api/videos/[id]/route.ts" "app/api/vimeo/upload/ticket/route.ts" "app/api/vimeo/status/[videoId]/route.ts" "app/api/cron/fetch-rss/route.ts"`: correcte.
- Dry-run SQL de `supabase/migrations/20260707180000_harden_core_rls_policies.sql` contra la BD real: correcte i revertit amb `ROLLBACK`.
- Simulacions RLS amb `SET ROLE authenticated` i JWT `sub` per rols reals: correcte i revertit amb `ROLLBACK`.
  - `display` no pot actualitzar videos ni inserir tags.
  - `editor_alumne` pot inserir video propi pendent, no pot inserir publicat, pot reenviar `needs_revision` a `pending_approval`, i no pot editar video propi publicat.
  - `editor_profe` pot editar videos del seu centre i no pot editar videos d'un altre centre.
  - `admin_global` pot editar videos de qualsevol centre.
  - l'usuari pot editar `full_name` propi pero no `role`.
- `npm run lint`: falla per deute preexistent i perque ESLint tambe entra a `.claude/worktrees/`; s'han vist errors previs de `any`, hooks React, refs durant render, components UI i altres fitxers no tocats en aquesta tongada.
- No s'ha executat `npm run build` encara: abans convindria decidir si es vol separar aquesta primera tongada en commit propi o continuar amb mes correccions, ja que el lint global no esta net.
- Verificacions pendents:
  - proves manuals/API de 401/403/200 per `PATCH`/`DELETE /api/videos/[id]` amb `editor_profe`, `editor_alumne`, `display` i `admin_global`.
  - prova de `POST /api/vimeo/upload/ticket` i `GET /api/vimeo/status/[videoId]` amb rols permesos i `display`.
  - prova de `/api/cron/fetch-rss` amb `CRON_SECRET` absent/present i bearer incorrecte/correcte.
  - migracions RLS i simulacions SQL per tancar la defensa en profunditat.

---

# Registre de sessions

Anotar aqui cada sessio de revisio per mantenir continuitat entre converses.

## Sessio 2026-07-07

- Es crea aquest roadmap.
- Abans d'aquest document s'ha aplicat una migracio de seguretat per warnings probables de Supabase:
  - `supabase/migrations/20260707120000_fix_security_advisor_warnings.sql`
  - aplicada via `DATABASE_URL`, no via CLI/MCP, per bloqueig de permisos.
  - verifica `search_path` de funcions `SECURITY DEFINER`, revoca `EXECUTE` public de funcions trigger i substitueix la policy ampla de `users`.
- Tambe s'ha consolidat `AGENTS.md` com a font canonica i s'ha eliminat `CLAUDE.md`.
- S'ha completat el Pas 1 en mode auditoria nomes lectura, amb anotacio de conclusions al roadmap.
- S'ha completat el Pas 2 en mode auditoria nomes lectura:
  - revisades policies RLS reals, grants i simulacions de SELECT per `anon` i rols autenticats.
  - detectats riscos d'escriptura massa ampla a `users`, `videos`, `playlists`, `playlist_items`, `video_tags` i `video_hashtags`.
  - detectada dependencia general de RLS com a proteccio principal malgrat grants amplis a `anon`/`authenticated`.
- S'ha completat el Pas 3 en mode auditoria nomes lectura:
  - revisades les API routes sota `app/api/`, amb focus en videos, playlists, usuaris, RSS, display, schedule, Vimeo, landing i cron.
  - confirmat que admin/usuaris/RSS/display/schedule reforcen permisos en bona part, pero videos i playlist items no compensen prou els riscos RLS del Pas 2.
  - detectat us transversal de fallback a `user_metadata`, especialment critic a `app/api/videos/[id]/route.ts`.
  - detectat que els endpoints Vimeo autenticats no validen rol.
- S'ha completat el Pas 4 en mode auditoria nomes lectura:
  - revisats fluxos Auth SSR/cookies, login, logout, invitacio, reset password, `proxy.ts`, `AuthContext`, secrets locals, `service_role`, token Vimeo, cron, endpoints publics i headers.
  - confirmat que no s'han vist secrets reals versionats, pero `.env.local` i `.env.vercel` tenen secrets locals i no defineixen `CRON_SECRET`.
  - detectat que `proxy.ts` i el client continuen usant `user_metadata` per rol/centre, i que el cron pot quedar obert si falta `CRON_SECRET`.
  - detectats logs sensibles i superficie SSRF/rate-limit pendent a RSS/Vimeo.
- S'ha completat el Pas 5 en mode auditoria nomes lectura:
  - revisats fluxos de negoci d'usuaris, invitacions, videos, pujada Vimeo, moderacio, comparticio, tags/hashtags, playlists, calendari, landing, display, RSS/cron, notificacions i guest links.
  - contrastat codi/documentacio amb consultes de BD real per detectar incoherencies de dades.
  - confirmats invariants positius: videos amb tags, compartits publicats, playlists sense items pendents, anuncis ben tipats, globals amb items publicats/compartits, schedule amb llistes actives del mateix centre.
  - detectats drift i riscos en playlists editables per alumnes, centre sense `editor_profe`, notificacions `needs_revision`, bucket `announcement-frames`, RSS rotation i endpoints de videos.
- S'ha completat el Pas 6 com a consolidacio documental:
  - no s'han reescrit encara els documents funcionals grossos per evitar documentar com a correcte allo que pot canviar al Pas 7.
  - s'ha classificat la documentacio entre fonts operatives, documents a actualitzar despres de correccions i documents historics/obsolets.
  - s'ha identificat `docs/DB-AUDIT-REPORT.md` com el document mes urgent a substituir o marcar com a historic.
- S'ha iniciat el Pas 7 amb aplicacio controlada:
  - s'ha creat una matriu prioritzada de correccions C01-C15 dins el roadmap.
  - s'ha aplicat la primera tongada de codi sobre videos, endpoints Vimeo i cron RSS.
  - s'ha creat i validat en dry-run la migracio RLS critica per `videos`, `users`, `video_tags` i `video_hashtags`.
  - no s'han aplicat encara migracions RLS ni canvis directes persistents a la BD real.
  - la verificacio dirigida dels fitxers tocats passa amb ESLint; el lint global continua fallant per deute preexistent i worktrees locals.

## Proper pas recomanat

Aplicar manualment `supabase/migrations/20260707180000_harden_core_rls_policies.sql` al Supabase SQL Editor i repetir les simulacions RLS contra la BD ja persistida. Despres, continuar el **Pas 7** amb la segona tongada de playlists i `is_student_editable`.
