# Sistema RSS - PUBLI*CAT

Document viu del sistema RSS real: feeds, items importats, configuracio per centre, ordre de rotacio i cron d'actualitzacio.

## Taules

- `rss_feeds`: feed RSS/Atom, pot ser de centre o global. Camps clau: `center_id`, `name`, `url`, `is_active`, `is_in_rotation`, `last_fetched_at`, `last_error`, `error_count`.
- `rss_items`: items importats d'un feed. Camps clau: `feed_id`, `guid`, `title`, `description`, `link`, `pub_date`, `image_url`, `fetched_at`.
- `rss_center_settings`: configuracio per centre: `seconds_per_item`, `seconds_per_feed`, `refresh_minutes`, `image_height_percent`.
- `rss_rotation_order`: ordre dels feeds en rotacio per centre.

## API i Fluxos

- `GET /api/rss`: llista feeds i items visibles.
- `POST /api/rss`: crea feed, valida i fa fetch inicial d'items.
- `GET/PATCH/DELETE /api/rss/[id]`: consulta, actualitza o elimina feed.
- `POST /api/rss/validate`: valida un feed sense guardar-lo.
- `POST /api/rss/[id]/retry`: reintenta fetch d'un feed.
- `GET/PATCH /api/rss/settings`: configuracio per centre.
- `GET/POST /api/rss/rotation`: lectura i reordenacio de rotacio.
- `GET /api/cron/fetch-rss`: tasca diària protegida amb `CRON_SECRET`; elimina vídeos caducats, processa la cua de neteja externa i actualitza els feeds RSS.

## Cron

- En entorns no locals, `CRON_SECRET` ha d'estar configurat.
- El cron requereix header `Authorization: Bearer <CRON_SECRET>`.
- Abans de llegir els feeds, crida `delete_expired_videos()` amb `service_role`. La funció només elimina vídeos amb `delete_on` anterior al dia actual d'`Europe/Madrid`, perquè la data configurada és inclusiva.
- Si falta `CRON_SECRET` fora de desenvolupament, ha de fallar tancat.

## Permisos

- `admin_global` pot operar globalment.
- `editor_profe` gestiona RSS del seu centre.
- `display` nomes llegeix el necessari per pantalla.
- `editor_alumne` no hauria de gestionar RSS.

Nota: algunes rutes encara fan fallback a `user_metadata`; es deute pendent i no canvia la regla canonica.

## Seguretat i Punts Oberts

- La validacio URL ha de rebutjar SSRF: localhost, IPs privades, link-local i redirects perillosos.
- Cal revisar timeouts, mida maxima de resposta i nombre de redirects.
- Cal netejar o sincronitzar `rss_rotation_order` quan un feed es desactiva.
- Cal provar cron amb secret absent, incorrecte i correcte.
