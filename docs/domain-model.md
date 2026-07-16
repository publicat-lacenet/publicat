# Model de domini - PUBLI*CAT

Document canonic conceptual: explica que significa cada entitat i quines regles de producte s'han de preservar. L'esquema fisic detallat es a `docs/database.schema.md`.

## Entitats Principals

- **Zona**: agrupacio geografica de centres.
- **Centre**: tenant principal. La majoria de dades operatives pengen d'un `center_id`.
- **Usuari**: perfil aplicatiu a `public.users`, vinculat a Supabase Auth. Conté rol, centre, estat i dades de perfil.
- **Video**: contingut Vimeo d'un centre. Pot ser `content` o `announcement`.
- **Tag**: etiqueta global controlada.
- **Hashtag**: etiqueta lliure especifica d'un centre.
- **Playlist**: llista ordenada de videos. Pot ser `permanent`, `weekday`, `announcements`, `custom`, `global` o `landing`.
- **PlaylistItem**: relacio ordenada entre playlist i video.
- **ScheduleOverride**: assignacio d'una playlist a una data concreta per a un centre.
- **RSSFeed**: feed RSS de centre o global.
- **RSSItem**: item importat d'un feed.
- **RSSCenterSettings**: configuracio RSS per centre.
- **RSSRotationOrder**: ordre de rotacio dels feeds d'un centre.
- **DisplaySettings**: configuracio de pantalla per centre.
- **TickerMessage**: missatge de ticker general del centre o associat a una playlist de dia.
- **Notification**: avis associat a un usuari, sovint relacionat amb un video.
- **GuestAccessLink** i **AuditLog**: taules existents, tancades per RLS sense policies visibles a data 2026-07-09; s'han de tractar com a funcionalitats pendents.

## Regles de Tenant i Propietat

- `center_id` es el limit de tenant per defecte.
- `admin_global` pot operar globalment.
- `editor_profe`, `editor_alumne` i `display` queden limitats al seu centre, excepte quan veuen contingut public/compartit per disseny.
- `videos.zone_id` es deriva del centre i no s'ha de tractar com a font manual independent.
- Les decisions d'autoritzacio server-side han de consultar `public.users`; `user_metadata` no es font autoritzadora.

## Videos i Moderacio

Estats reals de `video_status`:

- `pending_approval`: video pendent de revisio, habitualment pujat per `editor_alumne`.
- `published`: video aprovat i visible segons permisos.
- `needs_revision`: video retornat a l'alumne amb comentari per corregir.

Regles:

- Els videos creats per `editor_alumne` entren com `pending_approval`.
- `editor_profe` i `admin_global` poden aprovar o demanar revisio.
- `editor_alumne` nomes pot corregir els seus videos en `needs_revision` i reenviar-los a `pending_approval`.
- Els videos creats per `editor_profe` o `admin_global` poden entrar publicats.
- Els videos compartits amb altres centres han de ser `published`.
- `vimeo_id` i `vimeo_hash` s'han de conservar per videos unlisted.
- `frames_urls` guarda fotogrames associats a anuncis/slideshow.
- Cada vídeo té una política de conservació:
  - `end_of_school_year`: es conserva fins al 31 de juliol corresponent.
  - `indefinite`: no té eliminació automàtica.
  - `custom_date`: es conserva fins a la data concreta seleccionada.
- La data és inclusiva. L'eliminació automàtica s'executa l'endemà i reutilitza el mateix procés atòmic i la mateixa cua de neteja externa que l'eliminació manual.
- Els vídeos creats abans d'aquesta funcionalitat es conserven indefinidament.

Nota: `rejected_at`, `rejected_by_user_id` i `rejection_comment` existeixen a BD, pero el flux viu prioritza `needs_revision` per retorn amb feedback. No documentis `rejected` com a estat enum: no existeix dins `video_status`.

## Playlists i Landing

- Les playlists de centre tenen `center_id`.
- Les playlists globals o de landing poden tenir `center_id = null`.
- La landing publica actual s'ha d'entendre com una llista publica/global que nomes pot mostrar videos `published` i compartits.
- `playlist_items` ordena els videos dins la playlist.
- `display_settings.default_playlist_mode` decideix si el centre funciona amb `permanent` o `weekday` quan no hi ha calendari.
- `schedule_overrides` assigna una playlist activa a una data concreta i sempre passa per sobre del mode habitual.
- Les llistes `announcements` han de contenir videos de tipus `announcement`.

Pendent de decisio/producte:

- El comportament final de `is_student_editable` en playlists `weekday` i `announcements`.
- Fins que es tanqui, els docs han de dir que es una area pendent i no presentar una regla mes amplia com a definitiva.

## RSS i Display

- Els feeds RSS poden ser de centre o globals.
- `rss_items` es cache/importacio d'items.
- `rss_center_settings` defineix intervals i presentacio per centre.
- `rss_rotation_order` defineix l'ordre dels feeds a la pantalla.
- `display_settings` controla capcalera, rellotge, activacio global del ticker, volum, mode d'anuncis i mode habitual de playlist.
- `ticker_messages` conté missatges ordenats i activables per centre; `playlist_id = null` és el ticker general del Visor i `playlist_id` en una playlist `weekday` és el ticker d'aquell dia.
- En mode `weekday`, el ticker del dia té prioritat; si el dia no té missatges propis, el display usa el ticker general del Visor com a reserva. `display_settings.show_ticker` activa o desactiva qualsevol ticker a pantalla.

## Invariants

- Cap rol no editor ha de poder modificar contingut.
- La UI no es suficient com a control de seguretat; API i RLS han d'estar alineats.
- Les llistes publiques/globals no han d'exposar videos pendents, en revisio o no compartits.
- Les dades futures o tancades per RLS (`guest_access_links`, `audit_logs`) no s'han de donar per implementades a nivell de producte.
