# Model de Dades PUBLI*CAT

**Versió:** 1.0
**Data:** 2026-01-26
**Autor:** Documentació generada automàticament

---

## Resum Executiu

### Estadístiques de la Base de Dades

| Element | Quantitat |
|---------|-----------|
| Taules | 19 |
| Enums | 5 |
| Polítiques RLS | 45 |
| Triggers | 16 |
| Foreign Keys | 34 |
| Índexs | 49 |

### Dades Actuals

| Taula | Files |
|-------|-------|
| rss_items | 1,300 |
| video_tags | 97 |
| playlists | 86 |
| videos | 83 |
| video_hashtags | 66 |
| notifications | 49 |
| hashtags | 32 |
| playlist_items | 25 |
| users | 19 |
| rss_feeds | 17 |
| rss_rotation_order | 17 |
| centers | 8 |
| display_settings | 1 |
| zones | 0 |
| tags | 0 |
| rss_center_settings | 0 |
| schedule_overrides | 0 |
| guest_access_links | 0 |
| audit_logs | 0 |

---

## Diagrama de Relacions (ER)

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                          zones                               │
                                    │  (0 rows) - Zones geogràfiques                              │
                                    └─────────────────────────────────────────────────────────────┘
                                                              │
                                                              │ 1:N
                                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           centers                                                    │
│  (8 rows) - Centres educatius (tenants del sistema multi-tenant)                                    │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
           │              │              │              │              │              │
           │              │              │              │              │              │
           ▼              ▼              ▼              ▼              ▼              ▼
      ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
      │  users  │   │ hashtags │   │playlists │   │rss_feeds │   │ display_ │   │ guest_   │
      │(19 rows)│   │(32 rows) │   │(86 rows) │   │(17 rows) │   │ settings │   │ access_  │
      └────┬────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘   │ (1 row)  │   │ links    │
           │              │              │              │         └──────────┘   └──────────┘
           │              │              │              │
           ▼              │              ▼              ▼
      ┌──────────┐        │        ┌──────────┐   ┌──────────┐
      │  videos  │◄───────┘        │playlist_ │   │rss_items │
      │(83 rows) │                 │  items   │   │(1300 rows│
      └────┬─────┘                 │(25 rows) │   └──────────┘
           │                       └────┬─────┘
           │                            │
           ├──────────────────────────►─┘
           │
           ▼
      ┌──────────┐        ┌──────────┐
      │video_tags│◄──────►│   tags   │
      │(97 rows) │        │ (0 rows) │
      └──────────┘        └──────────┘
           │
           ▼
      ┌──────────┐
      │  video_  │
      │ hashtags │
      │(66 rows) │
      └──────────┘


Relacions principals:
─────────────────────
zones ──1:N──► centers ──1:N──► users
                       ──1:N──► videos ──N:M──► tags (via video_tags)
                               ──N:M──► hashtags (via video_hashtags)
                       ──1:N──► playlists ──1:N──► playlist_items ──N:1──► videos
                       ──1:N──► hashtags
                       ──1:N──► rss_feeds ──1:N──► rss_items
                       ──1:1──► display_settings
                       ──1:1──► rss_center_settings
                       ──1:N──► rss_rotation_order
                       ──1:N──► schedule_overrides
                       ──1:N──► guest_access_links

users ──1:N──► notifications
      ──1:N──► audit_logs
```

---

## Enums

### `user_role`
Rols d'usuari del sistema.

| Valor | Descripció |
|-------|------------|
| `admin_global` | Administrador global amb accés total |
| `editor_profe` | Editor professor - gestiona contingut del centre |
| `editor_alumne` | Editor alumne - pot pujar vídeos (requereix aprovació) |
| `display` | Mode pantalla - només lectura per TV |

### `onboarding_status`
Estat de l'onboarding de l'usuari.

| Valor | Descripció |
|-------|------------|
| `invited` | Usuari convidat, pendent d'activació |
| `active` | Usuari actiu |
| `disabled` | Usuari desactivat |

### `video_type`
Tipus de vídeo.

| Valor | Descripció |
|-------|------------|
| `content` | Contingut educatiu regular |
| `announcement` | Anunci/avís |

### `video_status`
Estat del vídeo en el flux de moderació.

| Valor | Descripció |
|-------|------------|
| `pending_approval` | Pendent d'aprovació |
| `published` | Publicat i visible |

### `playlist_kind`
Tipus de playlist.

| Valor | Descripció |
|-------|------------|
| `weekday` | Llista de dia de la setmana (dilluns-diumenge) |
| `announcements` | Llista d'anuncis |
| `custom` | Llista personalitzada |
| `global` | Llista global (sense centre) |
| `landing` | Llista de pàgina d'inici |

---

## Taules

### Taules Core

#### `zones`
Zones geogràfiques que agrupen centres.

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `name` | text | NO | - | Nom únic de la zona |
| `is_active` | boolean | NO | true | Activa/inactiva |
| `created_at` | timestamptz | NO | now() | Data creació |
| `updated_at` | timestamptz | NO | now() | Data actualització |

**Constraints:** PK(id), UNIQUE(name)

---

#### `centers`
Centres educatius - entitat principal del sistema multi-tenant.

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `name` | text | NO | - | Nom del centre |
| `zone_id` | uuid | NO | - | FK → zones.id |
| `logo_url` | text | YES | - | URL del logo |
| `is_active` | boolean | NO | true | Actiu/inactiu |
| `created_at` | timestamptz | NO | now() | Data creació |
| `updated_at` | timestamptz | NO | now() | Data actualització |

**Constraints:** PK(id), FK(zone_id) → zones(id) ON DELETE RESTRICT

---

#### `users`
Usuaris del sistema.

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `id` | uuid | NO | - | PK, FK → auth.users.id |
| `email` | text | NO | - | Email únic |
| `role` | user_role | NO | - | Rol de l'usuari |
| `center_id` | uuid | YES | - | FK → centers.id (NULL per admin_global) |
| `full_name` | text | YES | - | Nom complet |
| `phone` | text | YES | - | Telèfon |
| `onboarding_status` | onboarding_status | NO | 'invited' | Estat onboarding |
| `is_active` | boolean | NO | true | Actiu/inactiu |
| `invited_at` | timestamptz | YES | - | Data invitació |
| `activated_at` | timestamptz | YES | - | Data activació |
| `created_at` | timestamptz | NO | now() | Data creació |
| `updated_at` | timestamptz | NO | now() | Data actualització |
| `created_by_user_id` | uuid | YES | - | FK → users.id (qui va crear) |
| `last_invitation_sent_at` | timestamptz | YES | - | Última invitació (cooldown) |

**Constraints:** PK(id), UNIQUE(email), FK(center_id) → centers(id) ON DELETE RESTRICT, FK(id) → auth.users(id), FK(created_by_user_id) → users(id) ON DELETE SET NULL

---

#### `videos`
Vídeos de Vimeo.

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `center_id` | uuid | NO | - | FK → centers.id |
| `title` | text | NO | - | Títol del vídeo |
| `description` | text | YES | - | Descripció |
| `type` | video_type | NO | 'content' | Tipus de vídeo |
| `status` | video_status | NO | 'pending_approval' | Estat de moderació |
| `vimeo_url` | text | NO | - | URL completa de Vimeo |
| `vimeo_id` | text | YES | - | ID numèric de Vimeo |
| `vimeo_hash` | text | YES | - | Hash per vídeos unlisted |
| `duration_seconds` | integer | YES | - | Durada en segons |
| `thumbnail_url` | text | YES | - | URL miniatura |
| `uploaded_by_user_id` | uuid | NO | - | FK → users.id (autor) |
| `approved_by_user_id` | uuid | YES | - | FK → users.id (moderador) |
| `approved_at` | timestamptz | YES | - | Data aprovació |
| `is_shared_with_other_centers` | boolean | NO | false | Compartit amb altres centres |
| `shared_by_user_id` | uuid | YES | - | FK → users.id (qui va compartir) |
| `shared_at` | timestamptz | YES | - | Data compartició |
| `zone_id` | uuid | YES | - | FK → zones.id (desnormalitzat) |
| `is_active` | boolean | NO | true | Actiu/inactiu |
| `created_at` | timestamptz | NO | now() | Data creació |
| `updated_at` | timestamptz | NO | now() | Data actualització |

**Constraints:** PK(id), FK(center_id) → centers(id) ON DELETE RESTRICT, FK(uploaded_by_user_id) → users(id) ON DELETE RESTRICT, FK(approved_by_user_id) → users(id) ON DELETE SET NULL, FK(shared_by_user_id) → users(id) ON DELETE SET NULL, FK(zone_id) → zones(id) ON DELETE RESTRICT

---

### Taules de Classificació

#### `tags`
Etiquetes globals (controlades per admin_global).

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `name` | text | NO | - | Nom únic |
| `is_active` | boolean | NO | true | Activa/inactiva |
| `created_at` | timestamptz | NO | now() | Data creació |
| `updated_at` | timestamptz | NO | now() | Data actualització |

**Constraints:** PK(id), UNIQUE(name)

---

#### `hashtags`
Etiquetes específiques per centre (creades lliurement).

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `center_id` | uuid | NO | - | FK → centers.id |
| `name` | text | NO | - | Nom |
| `is_active` | boolean | NO | true | Actiu/inactiu |
| `created_at` | timestamptz | NO | now() | Data creació |
| `updated_at` | timestamptz | NO | now() | Data actualització |

**Constraints:** PK(id), UNIQUE(center_id, name), FK(center_id) → centers(id) ON DELETE CASCADE

---

#### `video_tags`
Relació N:M entre vídeos i tags globals.

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `video_id` | uuid | NO | - | FK → videos.id |
| `tag_id` | uuid | NO | - | FK → tags.id |

**Constraints:** PK(video_id, tag_id), FK(video_id) → videos(id) ON DELETE CASCADE, FK(tag_id) → tags(id) ON DELETE RESTRICT

---

#### `video_hashtags`
Relació N:M entre vídeos i hashtags de centre.

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `video_id` | uuid | NO | - | FK → videos.id |
| `hashtag_id` | uuid | NO | - | FK → hashtags.id |

**Constraints:** PK(video_id, hashtag_id), FK(video_id) → videos(id) ON DELETE CASCADE, FK(hashtag_id) → hashtags(id) ON DELETE CASCADE

---

### Taules de Playlists

#### `playlists`
Llistes de reproducció.

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `center_id` | uuid | YES | - | FK → centers.id (NULL = global) |
| `name` | text | NO | - | Nom de la llista |
| `kind` | playlist_kind | NO | - | Tipus de llista |
| `is_deletable` | boolean | NO | true | Es pot esborrar? |
| `is_student_editable` | boolean | NO | false | Editable per alumnes? |
| `origin_playlist_id` | uuid | YES | - | FK → playlists.id (còpia) |
| `created_by_user_id` | uuid | YES | - | FK → users.id |
| `is_active` | boolean | NO | true | Activa/inactiva |
| `created_at` | timestamptz | NO | now() | Data creació |
| `updated_at` | timestamptz | NO | now() | Data actualització |

**Constraints:** PK(id), FK(center_id) → centers(id) ON DELETE CASCADE, FK(created_by_user_id) → users(id) ON DELETE SET NULL, FK(origin_playlist_id) → playlists(id) ON DELETE SET NULL

---

#### `playlist_items`
Elements dins d'una playlist.

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `playlist_id` | uuid | NO | - | FK → playlists.id |
| `video_id` | uuid | NO | - | FK → videos.id |
| `position` | integer | NO | - | Ordre dins la llista |
| `added_at` | timestamptz | NO | now() | Data addició |
| `added_by_user_id` | uuid | YES | - | FK → users.id |

**Constraints:** PK(id), UNIQUE(playlist_id, position), FK(playlist_id) → playlists(id) ON DELETE CASCADE, FK(video_id) → videos(id) ON DELETE CASCADE, FK(added_by_user_id) → users(id) ON DELETE SET NULL

**Nota:** No hi ha UNIQUE(playlist_id, video_id) - un vídeo pot estar duplicat a la mateixa playlist.

---

### Taules RSS

#### `rss_feeds`
Fonts RSS configurades.

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `center_id` | uuid | YES | - | FK → centers.id (NULL = global) |
| `name` | text | NO | - | Nom del feed |
| `url` | text | NO | - | URL del feed |
| `is_active` | boolean | NO | true | Actiu/inactiu |
| `is_in_rotation` | boolean | NO | true | Inclòs en rotació |
| `last_fetched_at` | timestamptz | YES | - | Última sincronització |
| `last_error` | text | YES | - | Últim error |
| `error_count` | integer | NO | 0 | Errors consecutius (≥5 desactiva) |
| `created_by_user_id` | uuid | YES | - | FK → users.id |
| `created_at` | timestamptz | NO | now() | Data creació |
| `updated_at` | timestamptz | NO | now() | Data actualització |

**Constraints:** PK(id), FK(center_id) → centers(id) ON DELETE CASCADE, FK(created_by_user_id) → users(id) ON DELETE SET NULL

---

#### `rss_items`
Caché d'ítems RSS (gestionat per cron job amb service_role).

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `feed_id` | uuid | NO | - | FK → rss_feeds.id |
| `guid` | text | NO | - | Identificador únic de l'ítem |
| `title` | text | NO | - | Títol |
| `description` | text | YES | - | Descripció |
| `link` | text | NO | - | URL de l'article |
| `pub_date` | timestamptz | YES | - | Data publicació |
| `image_url` | text | YES | - | URL de la imatge |
| `fetched_at` | timestamptz | NO | now() | Data fetch |

**Constraints:** PK(id), UNIQUE(feed_id, guid), FK(feed_id) → rss_feeds(id) ON DELETE CASCADE

---

#### `rss_center_settings`
Configuració RSS específica per centre.

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `center_id` | uuid | NO | - | PK, FK → centers.id |
| `seconds_per_item` | integer | NO | 15 | Segons per ítem |
| `seconds_per_feed` | integer | NO | 120 | Segons per feed |
| `refresh_minutes` | integer | NO | 60 | Interval de refresc |
| `updated_at` | timestamptz | NO | now() | Data actualització |

**Constraints:** PK(center_id), FK(center_id) → centers(id) ON DELETE CASCADE

---

#### `rss_rotation_order`
Ordre de rotació dels feeds per centre.

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `center_id` | uuid | NO | - | PK, FK → centers.id |
| `feed_id` | uuid | NO | - | PK, FK → rss_feeds.id |
| `position` | integer | NO | - | Posició en la rotació |

**Constraints:** PK(center_id, feed_id), UNIQUE(center_id, position), FK(center_id) → centers(id) ON DELETE CASCADE, FK(feed_id) → rss_feeds(id) ON DELETE CASCADE

---

### Taules de Display

#### `display_settings`
Configuració de pantalla per centre.

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `center_id` | uuid | NO | - | PK, FK → centers.id |
| `show_header` | boolean | NO | true | Mostrar capçalera |
| `show_clock` | boolean | NO | true | Mostrar rellotge |
| `show_ticker` | boolean | NO | false | Mostrar ticker |
| `ticker_speed` | integer | NO | 50 | Velocitat ticker (px/s) |
| `primary_color` | text | NO | '#FEDD2C' | Color principal |
| `standby_message` | text | YES | 'Pròximament...' | Missatge standby |
| `announcement_volume` | integer | NO | 0 | Volum anuncis (0-100) |
| `created_at` | timestamptz | NO | now() | Data creació |
| `updated_at` | timestamptz | NO | now() | Data actualització |

**Constraints:** PK(center_id), CHECK(announcement_volume >= 0 AND announcement_volume <= 100), FK(center_id) → centers(id) ON DELETE CASCADE

---

#### `schedule_overrides`
Excepcions de programació per dates específiques.

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `center_id` | uuid | NO | - | FK → centers.id |
| `date` | date | NO | - | Data de l'excepció |
| `playlist_id` | uuid | NO | - | FK → playlists.id |
| `created_by_user_id` | uuid | YES | - | FK → users.id |
| `created_at` | timestamptz | NO | now() | Data creació |

**Constraints:** PK(id), UNIQUE(center_id, date), FK(center_id) → centers(id) ON DELETE CASCADE, FK(playlist_id) → playlists(id) ON DELETE RESTRICT, FK(created_by_user_id) → users(id) ON DELETE SET NULL

---

### Taules de Suport

#### `notifications`
Notificacions d'usuari.

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `user_id` | uuid | NO | - | FK → users.id |
| `type` | text | NO | - | Tipus (video_pending, video_approved, video_rejected) |
| `title` | text | NO | - | Títol |
| `message` | text | NO | - | Missatge |
| `video_id` | uuid | YES | - | FK → videos.id (opcional) |
| `is_read` | boolean | NO | false | Llegida/no llegida |
| `created_at` | timestamptz | NO | now() | Data creació |

**Constraints:** PK(id), FK(user_id) → users(id) ON DELETE CASCADE, FK(video_id) → videos(id) ON DELETE CASCADE

---

#### `guest_access_links`
Enllaços d'accés per convidats.

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `token` | text | NO | - | Token únic |
| `center_id` | uuid | NO | - | FK → centers.id |
| `expires_at` | timestamptz | NO | - | Data expiració |
| `created_by_user_id` | uuid | YES | - | FK → users.id |
| `created_at` | timestamptz | NO | now() | Data creació |
| `revoked_at` | timestamptz | YES | - | Data revocació |

**Constraints:** PK(id), UNIQUE(token), FK(center_id) → centers(id) ON DELETE CASCADE, FK(created_by_user_id) → users(id) ON DELETE SET NULL

---

#### `audit_logs`
Registre d'auditoria.

| Columna | Tipus | Nullable | Default | Descripció |
|---------|-------|----------|---------|------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `user_id` | uuid | YES | - | FK → users.id |
| `action` | text | NO | - | Acció realitzada |
| `entity_type` | text | NO | - | Tipus d'entitat |
| `entity_id` | uuid | YES | - | ID de l'entitat |
| `details` | jsonb | YES | - | Detalls addicionals |
| `ip_address` | text | YES | - | IP del client |
| `created_at` | timestamptz | NO | now() | Data creació |

**Constraints:** PK(id), FK(user_id) → users(id) ON DELETE SET NULL

---

## Foreign Keys

| Taula Origen | Columna | Taula Destí | ON DELETE |
|--------------|---------|-------------|-----------|
| audit_logs | user_id | users | SET NULL |
| centers | zone_id | zones | RESTRICT |
| display_settings | center_id | centers | CASCADE |
| guest_access_links | center_id | centers | CASCADE |
| guest_access_links | created_by_user_id | users | SET NULL |
| hashtags | center_id | centers | CASCADE |
| notifications | user_id | users | CASCADE |
| notifications | video_id | videos | CASCADE |
| playlist_items | added_by_user_id | users | SET NULL |
| playlist_items | playlist_id | playlists | CASCADE |
| playlist_items | video_id | videos | CASCADE |
| playlists | center_id | centers | CASCADE |
| playlists | created_by_user_id | users | SET NULL |
| playlists | origin_playlist_id | playlists | SET NULL |
| rss_center_settings | center_id | centers | CASCADE |
| rss_feeds | center_id | centers | CASCADE |
| rss_feeds | created_by_user_id | users | SET NULL |
| rss_items | feed_id | rss_feeds | CASCADE |
| rss_rotation_order | center_id | centers | CASCADE |
| rss_rotation_order | feed_id | rss_feeds | CASCADE |
| schedule_overrides | center_id | centers | CASCADE |
| schedule_overrides | created_by_user_id | users | SET NULL |
| schedule_overrides | playlist_id | playlists | RESTRICT |
| users | center_id | centers | RESTRICT |
| users | created_by_user_id | users | SET NULL |
| video_hashtags | hashtag_id | hashtags | CASCADE |
| video_hashtags | video_id | videos | CASCADE |
| video_tags | tag_id | tags | RESTRICT |
| video_tags | video_id | videos | CASCADE |
| videos | approved_by_user_id | users | SET NULL |
| videos | center_id | centers | RESTRICT |
| videos | shared_by_user_id | users | SET NULL |
| videos | uploaded_by_user_id | users | RESTRICT |
| videos | zone_id | zones | RESTRICT |

---

## Polítiques RLS

### `centers`

| Política | Acció | Condició |
|----------|-------|----------|
| Centers are manageable by admin_global | ALL | role = 'admin_global' |
| Users can view all centers for video metadata | SELECT | true (tots) |

### `display_settings`

| Política | Acció | Condició |
|----------|-------|----------|
| Users can view own center display settings | SELECT | center_id = user.center_id OR admin_global |
| Editors can create display settings | INSERT | (editor_profe OR admin_global) AND own center |
| Editors can update display settings | UPDATE | editor_profe own center OR admin_global |
| Editors can delete display settings | DELETE | editor_profe own center OR admin_global |

### `hashtags`

| Política | Acció | Condició |
|----------|-------|----------|
| Hashtags are viewable by center | SELECT | center_id = user.center_id OR admin_global |
| Hashtags are manageable by center editors | ALL | (admin_global OR editor_profe) AND own center |

### `notifications`

| Política | Acció | Condició |
|----------|-------|----------|
| Users can view own notifications | SELECT | user_id = auth.uid() |
| Users can update own notifications | UPDATE | user_id = auth.uid() |
| Users can delete own notifications | DELETE | user_id = auth.uid() |

### `playlist_items`

| Política | Acció | Condició |
|----------|-------|----------|
| Playlist items are viewable by playlist access | SELECT | EXISTS playlist |
| Playlist items are manageable by playlist access | ALL | admin_global OR (editor_profe AND own center) |

### `playlists`

| Política | Acció | Condició |
|----------|-------|----------|
| Playlists are viewable by center or if global | SELECT | own center OR global OR admin_global |
| Editors can manage playlists in their center | ALL | admin_global OR (editor_profe AND own center) |

### `rss_center_settings`

| Política | Acció | Condició |
|----------|-------|----------|
| Users can view own center settings | SELECT | own center OR admin_global |
| Editors can create center settings | INSERT | (editor_profe OR admin_global) AND own center |
| Editors can update center settings | UPDATE | editor_profe own center OR admin_global |

### `rss_feeds`

| Política | Acció | Condició |
|----------|-------|----------|
| Users can view own center feeds | SELECT | own center OR admin_global OR global |
| Editors can create feeds | INSERT | (editor_profe OR admin_global) AND own center |
| Editors can update feeds | UPDATE | editor_profe own center OR admin_global |
| Editors can delete feeds | DELETE | editor_profe own center OR admin_global |

### `rss_items`

| Política | Acció | Condició |
|----------|-------|----------|
| Users can view feed items | SELECT | feed belongs to own center OR admin_global OR global |

### `rss_rotation_order`

| Política | Acció | Condició |
|----------|-------|----------|
| Users can view own center rotation | SELECT | own center OR admin_global |
| Editors can manage center rotation | ALL | editor_profe own center OR admin_global |

### `tags`

| Política | Acció | Condició |
|----------|-------|----------|
| Tags are viewable by all | SELECT | true (tots) |
| Tags are manageable by admin_global | ALL | role = 'admin_global' |

### `users`

| Política | Acció | Condició |
|----------|-------|----------|
| Users can view own profile | SELECT | id = auth.uid() |
| Users can view other profiles | SELECT | true (tots) |
| Users can update own profile | UPDATE | id = auth.uid() |
| **Allow insert for authenticated** | INSERT | **true** ⚠️ |
| **Allow delete for authenticated** | DELETE | **true** ⚠️ |

### `video_hashtags`

| Política | Acció | Condició |
|----------|-------|----------|
| Video hashtags are viewable by anyone who can see the video | SELECT | EXISTS video |
| Video hashtags are manageable by anyone who can manage the video | ALL | EXISTS video |

### `video_tags`

| Política | Acció | Condició |
|----------|-------|----------|
| Video tags are viewable by anyone who can see the video | SELECT | EXISTS video |
| Video tags are manageable by anyone who can manage the video | ALL | EXISTS video |

### `videos`

| Política | Acció | Condició |
|----------|-------|----------|
| Videos are viewable by center or if shared | SELECT | own center OR shared OR admin_global |
| Users can manage videos in their center | ALL | own center OR admin_global |
| Editor-profe can view all center videos | SELECT | editor_profe AND own center AND active |
| Editor-profe can approve videos | UPDATE | editor_profe AND own center AND active |
| Editor-profe can delete videos | DELETE | editor_profe AND own center AND active |
| Editor-alumne can view videos | SELECT | editor_alumne AND own center AND (own pending OR published) |
| Editor-alumne can create videos | INSERT | editor_alumne AND own center AND active |

### `zones`

| Política | Acció | Condició |
|----------|-------|----------|
| Users can view all zones for video metadata | SELECT | true (tots) |
| Zones are manageable by admin_global | ALL | role = 'admin_global' |

### Taules SENSE Polítiques RLS (però amb RLS activat)

⚠️ **Atenció**: Aquestes taules tenen RLS activat però cap política definida, resultant en **ACCÉS DENEGAT** per a tots els usuaris:

- `audit_logs`
- `guest_access_links`
- `schedule_overrides`

---

## Triggers

| Trigger | Taula | Event | Funció | Descripció |
|---------|-------|-------|--------|------------|
| tr_zones_updated_at | zones | BEFORE UPDATE | set_updated_at() | Actualitza updated_at |
| tr_centers_updated_at | centers | BEFORE UPDATE | set_updated_at() | Actualitza updated_at |
| tr_center_default_playlists | centers | AFTER INSERT | create_default_playlists_for_center() | Crea playlists per defecte |
| tr_users_updated_at | users | BEFORE UPDATE | set_updated_at() | Actualitza updated_at |
| tr_assign_lacenet_to_admin | users | BEFORE INSERT | assign_lacenet_to_admin_global() | Assigna Lacenet als admin_global |
| tr_videos_updated_at | videos | BEFORE UPDATE | set_updated_at() | Actualitza updated_at |
| on_video_pending | videos | AFTER INSERT | notify_pending_video() | Notifica vídeo pendent |
| tr_video_pending_notification | videos | AFTER INSERT | notify_pending_video() | **Duplicat!** |
| on_video_status_change | videos | AFTER UPDATE | notify_video_approved() | Notifica aprovació |
| on_video_rejected | videos | BEFORE DELETE | notify_video_rejected() | Notifica rebuig |
| tr_tags_updated_at | tags | BEFORE UPDATE | set_updated_at() | Actualitza updated_at |
| tr_hashtags_updated_at | hashtags | BEFORE UPDATE | set_updated_at() | Actualitza updated_at |
| tr_playlists_updated_at | playlists | BEFORE UPDATE | set_updated_at() | Actualitza updated_at |
| tr_rss_feeds_updated_at | rss_feeds | BEFORE UPDATE | set_updated_at() | Actualitza updated_at |
| tr_rss_center_settings_updated_at | rss_center_settings | BEFORE UPDATE | set_updated_at() | Actualitza updated_at |
| tr_display_settings_updated_at | display_settings | BEFORE UPDATE | set_updated_at() | Actualitza updated_at |

**Nota:** Hi ha dos triggers (`on_video_pending` i `tr_video_pending_notification`) que executen la mateixa funció `notify_pending_video()`, causant **notificacions duplicades**.

---

## Funcions

### `set_updated_at()`
Actualitza el camp `updated_at` amb la data/hora actual.

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
```

### `assign_lacenet_to_admin_global()`
Assigna automàticament el centre "Lacenet" als usuaris admin_global.

```sql
CREATE OR REPLACE FUNCTION public.assign_lacenet_to_admin_global()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    lacenet_center_id uuid;
BEGIN
    IF NEW.role = 'admin_global' AND NEW.center_id IS NULL THEN
        SELECT id INTO lacenet_center_id
        FROM centers
        WHERE LOWER(name) = 'lacenet'
        LIMIT 1;

        IF lacenet_center_id IS NOT NULL THEN
            NEW.center_id := lacenet_center_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$
```

### `create_default_playlists_for_center()`
Crea les playlists per defecte quan es crea un nou centre.

```sql
CREATE OR REPLACE FUNCTION public.create_default_playlists_for_center()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO playlists (center_id, name, kind, is_deletable)
    VALUES
        (NEW.id, 'Dilluns', 'weekday', false),
        (NEW.id, 'Dimarts', 'weekday', false),
        (NEW.id, 'Dimecres', 'weekday', false),
        (NEW.id, 'Dijous', 'weekday', false),
        (NEW.id, 'Divendres', 'weekday', false),
        (NEW.id, 'Dissabte', 'weekday', false),
        (NEW.id, 'Diumenge', 'weekday', false),
        (NEW.id, 'Anuncis', 'announcements', false);
    RETURN NEW;
END;
$function$
```

### `notify_pending_video()`
Notifica als editors-profe quan hi ha un vídeo pendent d'aprovació.

### `notify_video_approved()`
Notifica a l'autor quan el seu vídeo és aprovat.

### `notify_video_rejected()`
Notifica a l'autor quan el seu vídeo és rebutjat (abans d'esborrar).

### `sync_user_email()`
Sincronitza l'email de auth.users a public.users.

---

## Índexs

### Índexs per Taula

#### `audit_logs`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| audit_logs_pkey | id | UNIQUE |
| idx_audit_logs_created_at | created_at | BTREE |
| idx_audit_logs_user_id | user_id | BTREE |

#### `centers`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| centers_pkey | id | UNIQUE |
| idx_centers_zone_id | zone_id | BTREE |

#### `display_settings`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| display_settings_pkey | center_id | UNIQUE |

#### `guest_access_links`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| guest_access_links_pkey | id | UNIQUE |
| guest_access_links_token_key | token | UNIQUE |

#### `hashtags`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| hashtags_pkey | id | UNIQUE |
| hashtags_center_id_name_key | center_id, name | UNIQUE |

#### `notifications`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| notifications_pkey | id | UNIQUE |
| idx_notifications_user_all | user_id, created_at DESC | BTREE |
| idx_notifications_user_unread | user_id, created_at DESC | BTREE (WHERE is_read = false) |

#### `playlist_items`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| playlist_items_pkey | id | UNIQUE |
| playlist_items_playlist_id_position_key | playlist_id, position | UNIQUE |
| idx_playlist_items_playlist_id | playlist_id | BTREE |

#### `playlists`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| playlists_pkey | id | UNIQUE |
| idx_playlists_center_kind | center_id, kind | BTREE |

#### `rss_center_settings`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| rss_center_settings_pkey | center_id | UNIQUE |

#### `rss_feeds`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| rss_feeds_pkey | id | UNIQUE |
| idx_rss_feeds_center_id | center_id | BTREE |
| idx_rss_feeds_active | center_id, is_active | BTREE (WHERE is_active AND error_count < 5) |

#### `rss_items`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| rss_items_pkey | id | UNIQUE |
| rss_items_feed_id_guid_key | feed_id, guid | UNIQUE |
| idx_rss_items_feed_id | feed_id | BTREE |
| idx_rss_items_pub_date | pub_date DESC | BTREE |

#### `rss_rotation_order`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| rss_rotation_order_pkey | center_id, feed_id | UNIQUE |
| rss_rotation_order_center_id_position_key | center_id, position | UNIQUE |

#### `schedule_overrides`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| schedule_overrides_pkey | id | UNIQUE |
| schedule_overrides_center_id_date_key | center_id, date | UNIQUE |
| idx_schedule_overrides_center_date | center_id, date | BTREE |

#### `tags`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| tags_pkey | id | UNIQUE |
| tags_name_key | name | UNIQUE |

#### `users`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| users_pkey | id | UNIQUE |
| users_email_key | email | UNIQUE |
| idx_users_center_id | center_id | BTREE |
| idx_users_role | role | BTREE |

#### `video_hashtags`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| video_hashtags_pkey | video_id, hashtag_id | UNIQUE |
| idx_video_hashtags_hashtag_id | hashtag_id | BTREE |

#### `video_tags`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| video_tags_pkey | video_id, tag_id | UNIQUE |
| idx_video_tags_tag_id | tag_id | BTREE |

#### `videos`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| videos_pkey | id | UNIQUE |
| idx_videos_center_id | center_id | BTREE |
| idx_videos_status | status | BTREE |
| idx_videos_vimeo_id | vimeo_id | BTREE |
| idx_videos_zone_id | zone_id | BTREE |
| idx_videos_shared | is_shared_with_other_centers | BTREE (WHERE true) |

#### `zones`
| Índex | Columnes | Tipus |
|-------|----------|-------|
| zones_pkey | id | UNIQUE |
| zones_name_key | name | UNIQUE |

---

## Errors Crítics i Recomanacions

### 🚨 CRÍTICS (Seguretat)

#### 1. Polítiques RLS perilloses a `users`

**Problema:**
```sql
-- Qualsevol usuari autenticat pot ESBORRAR qualsevol usuari!
"Allow delete for authenticated" → USING (true)

-- Qualsevol usuari autenticat pot INSERTAR qualsevol usuari!
"Allow insert for authenticated" → WITH CHECK (true)
```

**Impacte:** Vulnerabilitat de seguretat crítica. Un editor_alumne podria esborrar l'admin_global.

**Solució proposada:**
```sql
-- DELETE: només admin_global o editor_profe del mateix centre
DROP POLICY "Allow delete for authenticated" ON users;
CREATE POLICY "Admin and editors can delete users" ON users
FOR DELETE TO authenticated
USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
    OR (
        (SELECT role FROM users WHERE id = auth.uid()) = 'editor_profe'
        AND center_id = (SELECT center_id FROM users WHERE id = auth.uid())
    )
);

-- INSERT: només admin_global o editor_profe
DROP POLICY "Allow insert for authenticated" ON users;
CREATE POLICY "Admin and editors can create users" ON users
FOR INSERT TO authenticated
WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin_global', 'editor_profe')
);
```

---

#### 2. Taules amb RLS activat SENSE polítiques

**Taules afectades:**
- `audit_logs`
- `guest_access_links`
- `schedule_overrides`

**Impacte:** RLS activat sense polítiques = ACCÉS DENEGAT a tothom (incloent admins via l'app).

**Solució proposada:**
```sql
-- Opció A: Desactivar RLS si no és necessari
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE guest_access_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_overrides DISABLE ROW LEVEL SECURITY;

-- Opció B: Afegir polítiques adequades
CREATE POLICY "Admin can manage audit_logs" ON audit_logs
FOR ALL TO authenticated
USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin_global');
```

---

#### 3. Funcions amb search_path mutable

**Funcions afectades:**
- `set_updated_at`
- `sync_user_email`
- `create_default_playlists_for_center`
- `assign_lacenet_to_admin_global`
- `notify_pending_video`
- `notify_video_approved`
- `notify_video_rejected`

**Impacte:** Vulnerabilitat de seguretat - un atacant podria manipular el search_path per executar codi maliciós.

**Solució proposada:**
```sql
-- Afegir SET search_path a cada funció
ALTER FUNCTION set_updated_at() SET search_path = public;
ALTER FUNCTION sync_user_email() SET search_path = public;
ALTER FUNCTION create_default_playlists_for_center() SET search_path = public;
ALTER FUNCTION assign_lacenet_to_admin_global() SET search_path = public;
ALTER FUNCTION notify_pending_video() SET search_path = public;
ALTER FUNCTION notify_video_approved() SET search_path = public;
ALTER FUNCTION notify_video_rejected() SET search_path = public;
```

---

### ⚠️ IMPORTANTS (Rendiment)

#### 4. Foreign Keys sense índex

**FKs afectades:**
| Taula | Columna | Té índex? |
|-------|---------|-----------|
| videos | uploaded_by_user_id | ❌ |
| videos | approved_by_user_id | ❌ |
| videos | shared_by_user_id | ❌ |
| playlists | created_by_user_id | ❌ |
| playlists | origin_playlist_id | ❌ |
| playlist_items | video_id | ❌ |
| playlist_items | added_by_user_id | ❌ |
| notifications | video_id | ❌ |
| rss_feeds | created_by_user_id | ❌ |
| rss_rotation_order | feed_id | ❌ |
| schedule_overrides | center_id | ❌ (té idx compost) |
| schedule_overrides | playlist_id | ❌ |
| schedule_overrides | created_by_user_id | ❌ |
| guest_access_links | center_id | ❌ |
| guest_access_links | created_by_user_id | ❌ |
| users | created_by_user_id | ❌ |

**Impacte:** JOINs i DELETE en cascada més lents.

**Solució proposada:**
```sql
CREATE INDEX idx_videos_uploaded_by ON videos(uploaded_by_user_id);
CREATE INDEX idx_videos_approved_by ON videos(approved_by_user_id);
CREATE INDEX idx_videos_shared_by ON videos(shared_by_user_id);
CREATE INDEX idx_playlists_created_by ON playlists(created_by_user_id);
CREATE INDEX idx_playlists_origin ON playlists(origin_playlist_id);
CREATE INDEX idx_playlist_items_video ON playlist_items(video_id);
CREATE INDEX idx_playlist_items_added_by ON playlist_items(added_by_user_id);
CREATE INDEX idx_notifications_video ON notifications(video_id);
CREATE INDEX idx_rss_feeds_created_by ON rss_feeds(created_by_user_id);
CREATE INDEX idx_rss_rotation_feed ON rss_rotation_order(feed_id);
CREATE INDEX idx_schedule_playlist ON schedule_overrides(playlist_id);
CREATE INDEX idx_schedule_created_by ON schedule_overrides(created_by_user_id);
CREATE INDEX idx_guest_links_center ON guest_access_links(center_id);
CREATE INDEX idx_guest_links_created_by ON guest_access_links(created_by_user_id);
CREATE INDEX idx_users_created_by ON users(created_by_user_id);
```

---

#### 5. Triggers duplicats per notificacions

**Problema:** `on_video_pending` i `tr_video_pending_notification` executen la mateixa funció.

**Impacte:** Es creen notificacions duplicades cada vegada que es puja un vídeo.

**Solució proposada:**
```sql
DROP TRIGGER tr_video_pending_notification ON videos;
```

---

#### 6. Falta UNIQUE constraint a playlist_items

**Problema:** No hi ha constraint per evitar vídeos duplicats a la mateixa playlist.

**Solució proposada:**
```sql
ALTER TABLE playlist_items
ADD CONSTRAINT playlist_items_unique_video
UNIQUE (playlist_id, video_id);
```

---

### ℹ️ OBSERVACIONS (Disseny)

#### 7. Desnormalització de `videos.zone_id`

El camp `zone_id` a `videos` és desnormalitzat (es pot obtenir via `centers.zone_id`).

**Justificació:** Permet filtrar vídeos per zona sense fer JOIN amb centers, millorant el rendiment de consultes freqüents.

**Recomanació:** Mantenir però considerar crear un trigger per sincronitzar automàticament quan canvia `centers.zone_id`.

---

#### 8. Polítiques RLS amb `auth.uid()` sense subselect

**Problema:** 45+ polítiques utilitzen `auth.uid()` directament, que s'avalua per cada fila.

**Exemple problemàtic:**
```sql
USING (auth.uid() = user_id)
```

**Solució optimitzada:**
```sql
USING ((SELECT auth.uid()) = user_id)
```

El subselect força l'avaluació una sola vegada per consulta en lloc de per cada fila.

---

## Historial de Canvis

| Data | Versió | Descripció |
|------|--------|------------|
| 2026-01-26 | 1.0 | Documentació inicial generada |

---

## Referències

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Trigger Documentation](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [AGENTS.md - Guia del projecte](../AGENTS.md)
