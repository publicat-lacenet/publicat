# database-schema.md — Publicat

Aquest document descriu l’esquema físic (Postgres/Supabase) derivat del Domain Model: taules, columnes, constraints, índexs i notes d’implementació.

---

## 1) Convencions i criteris globals

### Schema i naming
- Schema: `public.*`
- Taules: **plural** i `snake_case` (p. ex. `centers`, `playlist_items`).
- Columnes: `snake_case` (p. ex. `center_id`, `created_at`).
- FK: `<entity>_id`.

### Tipus base
- Identificadors: `uuid` (default `gen_random_uuid()`).
- Dates: `date`.
- Timestamps: `timestamptz`.
- Text: `text` (o `citext` si volem uniques case-insensitive).
- Booleans: `boolean`.
- Ordres/posicions: `int`.

### Camps comuns
Recomanats a la majoria de taules:
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()` (via trigger)
- `is_active boolean not null default true` (quan tingui sentit)

### Soft delete vs is_active=false
- `is_active=false`: baixa lògica “operativa” (p. ex. usuaris, zones, hashtags, feeds).
- Soft delete (opcional): `deleted_at timestamptz` si volem conservar històric (no és imprescindible a la fase inicial).
- Delete físic: acceptable en entitats “transaccionals” si el domini ho indica (p. ex. **rebuig de vídeo = esborrat immediat**).

### Triggers utilitaris (recomanat)
- `set_updated_at()` per mantenir `updated_at` automàtic.
- (Opcional) `set_video_zone_from_center()` per assegurar `videos.zone_id = centers.zone_id`.

---

## 2) Enums o CHECK constraints

Recomanat: **Postgres ENUM** (clar, validació forta).

### Enums mínims
- `user_role`: `admin_global | editor_profe | editor_alumne | display`
- `onboarding_status`: `invited | active | disabled`
- `video_type`: `content | announcement`
- `video_status`: `pending_approval | published`
  - Nota: el domini diu que “rebutjat = esborrat”; si en el futur vols auditar, es pot afegir `rejected`.
- `playlist_kind`: `weekday | announcements | custom | global | landing`

---

## 3) Taules

> Format de cada taula:
> 1) Propòsit
> 2) Columnes
> 3) PK/FK
> 4) UNIQUE
> 5) Índexs
> 6) Constraints/triggers especials (si cal)

### 3.1 `public.zones`
**Propòsit:** catàleg global de zones geogràfiques.

**Columnes**
- `id uuid pk default gen_random_uuid()`
- `name text not null`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

**UNIQUE**
- `UNIQUE (name)` (idealment case-insensitive via `citext` o `unique(lower(name))`)

**Índexs**
- (implícit per UNIQUE)

---

### 3.2 `public.centers`
**Propòsit:** tenant del sistema.

**Columnes**
- `id uuid pk default gen_random_uuid()`
- `name text not null`
- `zone_id uuid not null`
- `logo_url text null` (URL pública de Supabase Storage bucket `center-logos`, vegeu `docs/storage.md`)
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

**FK**
- `zone_id -> zones(id) on delete restrict`

**Índexs**
- `index (zone_id)`
- (Opcional) `unique(lower(name))` si vols evitar duplicats globals de nom

---

### 3.3 `public.users` (perfil d’app)
**Propòsit:** perfil aplicatiu (rol, centre, estat, traçabilitat), 1:1 amb `auth.users`.

**Columnes**
- `id uuid pk`  (mateix id que `auth.users.id`)
- `email text not null` (cache de `auth.users.email`)
- `role user_role not null`
- `center_id uuid null`
- `is_active boolean not null default true`
- `full_name text null`
- `phone text null`
- `onboarding_status onboarding_status not null default 'invited'`
- `invited_at timestamptz null`
- `last_invitation_sent_at timestamptz null`
- `activated_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `created_by_user_id uuid null` (auditoria)

**FK**
- `id -> auth.users(id) on delete cascade|restrict` (veure secció 4)
- `center_id -> centers(id) on delete restrict`
- `created_by_user_id -> users(id) on delete set null`

**UNIQUE**
- `UNIQUE (lower(email))` (email no pot estar associat a més d’un centre)

**Constraints**
- `CHECK ((role = 'admin_global' AND center_id IS NULL) OR (role <> 'admin_global' AND center_id IS NOT NULL))`

**Índexs**
- `index (center_id)`
- `index (role)`
- `index (is_active)`
- `index (onboarding_status)`

---

### 3.4 `public.guest_access_links`
**Propòsit:** accés temporal sense autenticació per veure contingut publicat d’un centre.

**Columnes**
- `id uuid pk default gen_random_uuid()`
- `token text not null` *(o millor: `token_hash text not null` i no guardar el token en clar)*
- `center_id uuid not null`
- `expires_at timestamptz not null`
- `created_at timestamptz not null default now()`
- `created_by_user_id uuid not null`
- `revoked_at timestamptz null`
- `revoked_by_user_id uuid null`
- `full_name text null`

**FK**
- `center_id -> centers(id) on delete cascade`
- `created_by_user_id -> users(id) on delete restrict`
- `revoked_by_user_id -> users(id) on delete set null`

**UNIQUE**
- `UNIQUE (token)` (o `token_hash`)

**Índexs**
- `index (center_id)`
- `index (expires_at)`
- `index (revoked_at)`

---

### 3.5 `public.videos`
**Propòsit:** contingut audiovisual (Vimeo) d’un centre, amb moderació i compartició.

**Columnes**
- `id uuid pk default gen_random_uuid()`
- `center_id uuid not null`
- `zone_id uuid not null` *(redundant/derivada; recomanat per filtres ràpids)*
- `title text not null`
- `description text null`
- `type video_type not null default 'content'`
- `status video_status not null default 'pending_approval'`
- `vimeo_url text null` *(fase 1)*
- `vimeo_id text null` *(fase 2)*
- `duration_seconds int null`
- `thumbnail_url text null`
- `uploaded_by_user_id uuid not null`
- `approved_by_user_id uuid null`
- `approved_at timestamptz null`
- `is_shared_with_other_centers boolean not null default false`
- `shared_by_user_id uuid null`
- `shared_at timestamptz null`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

**FK**
- `center_id -> centers(id) on delete restrict`
- `zone_id -> zones(id) on delete restrict`
- `uploaded_by_user_id -> users(id) on delete restrict`
- `approved_by_user_id -> users(id) on delete set null`
- `shared_by_user_id -> users(id) on delete set null`

**Constraints (recomanats)**
- (Opcional) `CHECK (duration_seconds IS NULL OR duration_seconds >= 0)`
- Coherència `zone_id`: via trigger que copiï `centers.zone_id` quan es crea/actualitza `center_id`.

**Índexs “load-bearing”**
- `index (center_id)`
- `index (zone_id)`
- `index (status)`
- `index (type)`
- `index (is_shared_with_other_centers)`
- (Opcional) `index (created_at desc)`

---

### 3.6 `public.tags`
**Propòsit:** catàleg global d’etiquetes (controlat).

**Columnes**
- `id uuid pk default gen_random_uuid()`
- `name text not null`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

**UNIQUE**
- `UNIQUE (lower(name))`

---

### 3.7 `public.hashtags`
**Propòsit:** etiquetes internes per centre (opcionales).

**Columnes**
- `id uuid pk default gen_random_uuid()`
- `center_id uuid not null`
- `name text not null`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

**FK**
- `center_id -> centers(id) on delete cascade`

**UNIQUE**
- `UNIQUE (center_id, lower(name))`

**Índexs**
- `index (center_id)`

---

### 3.8 `public.playlists`
**Propòsit:** llista ordenada de vídeos (weekday/announcements/custom/global/landing).

**Columnes**
- `id uuid pk default gen_random_uuid()`
- `center_id uuid null` *(null = definició global / landing)*
- `name text not null`
- `kind playlist_kind not null`
- `is_deletable boolean not null default true`
- `is_student_editable boolean not null default false`
- `origin_playlist_id uuid null` *(còpia local -> apunta a la global d’origen)*
- `created_by_user_id uuid null`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

**FK**
- `center_id -> centers(id) on delete cascade`
- `origin_playlist_id -> playlists(id) on delete restrict`
- `created_by_user_id -> users(id) on delete set null`

**Constraints (clau del domini)**
- `CHECK` de coherència `center_id` segons `kind`:
  - `weekday | announcements | custom` => `center_id IS NOT NULL`
  - `landing` => `center_id IS NULL AND origin_playlist_id IS NULL`
  - `global`:
    - definició global => `center_id IS NULL AND origin_playlist_id IS NULL`
    - còpia local => `center_id IS NOT NULL AND origin_playlist_id IS NOT NULL`
- `CHECK` per a alumnat:
  - `is_student_editable = false` si `kind IN ('announcements','global','landing')`

**UNIQUE (recomanat)**
- `UNIQUE (center_id, kind, lower(name))` *(per evitar duplicats dins un centre; per globals, `center_id` null)*

**Índexs**
- `index (center_id, kind)`
- `index (origin_playlist_id)`

---

### 3.9 `public.playlist_items`
**Propòsit:** join ordenat playlist↔video.

**Columnes**
- `id uuid pk default gen_random_uuid()`
- `playlist_id uuid not null`
- `video_id uuid not null`
- `position int not null`
- `added_at timestamptz not null default now()`
- `added_by_user_id uuid null`

**FK**
- `playlist_id -> playlists(id) on delete cascade`
- `video_id -> videos(id) on delete cascade`
- `added_by_user_id -> users(id) on delete set null`

**UNIQUE**
- `UNIQUE (playlist_id, position)`
- (Opcional) `UNIQUE (playlist_id, video_id)` si **no** vols duplicats del mateix vídeo a la mateixa llista.

**Índexs**
- `index (playlist_id, position)`
- `index (video_id)`

**Regles difícils de garantir només amb schema**
- Si `playlists.kind = 'announcements'`, només permetre `videos.type = 'announcement'`.
  - Recomanat: validació d’app + (opcional) trigger.

---

### 3.10 `public.schedule_overrides`
**Propòsit:** assignar una playlist a una data concreta per un centre (decisió “una fila per dia”).

**Columnes**
- `id uuid pk default gen_random_uuid()`
- `center_id uuid not null`
- `date date not null`
- `playlist_id uuid not null`
- `created_by_user_id uuid not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

**FK**
- `center_id -> centers(id) on delete cascade`
- `playlist_id -> playlists(id) on delete restrict`
- `created_by_user_id -> users(id) on delete restrict`

**UNIQUE**
- `UNIQUE (center_id, date)`

**Índexs**
- `index (center_id, date)`

**Regles de domini (validació app / trigger opcional)**
- `playlist_id` només pot apuntar a llistes `custom` o `global` (còpies locals).

---

### 3.11 `public.rss_feeds`
**Propòsit:** definició de feeds RSS (de centre o globals).

**Columnes**
- `id uuid pk default gen_random_uuid()`
- `center_id uuid null` *(null = feed global)*
- `name text not null`
- `url text not null`
- `is_active boolean not null default true`
- `last_fetched_at timestamptz null`
- `last_error text null`
- `created_by_user_id uuid null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

**FK**
- `center_id -> centers(id) on delete cascade`
- `created_by_user_id -> users(id) on delete set null`

**UNIQUE (recomanat)**
- `UNIQUE (center_id, url)` *(evitar duplicats dins el mateix àmbit)*

**Índexs**
- `index (center_id, is_active)`

---

### 3.12 `public.rss_center_settings`
**Propòsit:** paràmetres globals RSS per centre (intervals i límits).

**Columnes**
- `center_id uuid pk`
- `seconds_per_item int not null default 15`
- `seconds_per_feed int not null default 120`
- `refresh_minutes int not null default 60`
- `max_items_per_feed int not null default 20`
- `updated_at timestamptz not null default now()`
- `updated_by_user_id uuid null`

**FK**
- `center_id -> centers(id) on delete cascade`
- `updated_by_user_id -> users(id) on delete set null`

---

### 3.13 `public.rss_rotation_order`
**Propòsit:** quins feeds estan en rotació per un centre i en quin ordre.

**Columnes**
- `center_id uuid not null`
- `feed_id uuid not null`
- `position int not null`
- `created_at timestamptz not null default now()`

**PK**
- `PRIMARY KEY (center_id, feed_id)`

**FK**
- `center_id -> centers(id) on delete cascade`
- `feed_id -> rss_feeds(id) on delete cascade`

**UNIQUE**
- `UNIQUE (center_id, position)`

**Índexs**
- `index (center_id, position)`
- `index (feed_id)`

---

### 3.14 Taules d’unió N–M

#### `public.video_tags`
**Propòsit:** assignar tags globals a un vídeo (mínim 1 tag per vídeo: regla de domini).

**Columnes / PK**
- `video_id uuid not null`
- `tag_id uuid not null`
- `PRIMARY KEY (video_id, tag_id)`

**FK**
- `video_id -> videos(id) on delete cascade`
- `tag_id -> tags(id) on delete restrict`

**Índexs**
- `index (tag_id)`

> Regla “mínim 1 tag”: millor via validació d’app; si cal reforç, trigger/constraint deferrable.

#### `public.video_hashtags`
**Propòsit:** assignar hashtags de centre a un vídeo (0..N).

**Columnes / PK**
- `video_id uuid not null`
- `hashtag_id uuid not null`
- `PRIMARY KEY (video_id, hashtag_id)`

**FK**
- `video_id -> videos(id) on delete cascade`
- `hashtag_id -> hashtags(id) on delete restrict`

**Índexs**
- `index (hashtag_id)`

---

## 4) Clau important: relació amb `auth.users`

### Enllaç 1:1
- `public.users.id uuid PRIMARY KEY`
- `public.users.id` és **FK a** `auth.users(id)` (mateix UUID)

### Política d’eliminació recomanada
Escollir una i documentar-la:
- **Opció A (recomanada a molts casos):** `ON DELETE CASCADE`
  - Si s’elimina un usuari d’Auth, desapareix el perfil d’app.
- **Opció B:** `ON DELETE RESTRICT`
  - Evita eliminacions accidentals (cal desactivar en lloc d’esborrar).

### CHECK “admin_global sense centre”
- `center_id IS NULL` **només** si `role='admin_global'` (i viceversa). (Ja definit a `users`)

### Email
- `public.users.email` és una cache útil per a consultes UI.
- Recomanat: garantir `UNIQUE(lower(email))` a `public.users` (email únic global).

---

## 5) Constraints i índexs load-bearing (resum)

- `zones`: `UNIQUE(lower(name))`
- `hashtags`: `UNIQUE(center_id, lower(name))`
- `schedule_overrides`: `UNIQUE(center_id, date)`
- `video_tags`: `PRIMARY KEY(video_id, tag_id)` + index `(tag_id)`
- `video_hashtags`: `PRIMARY KEY(video_id, hashtag_id)` + index `(hashtag_id)`
- `playlist_items`:
  - `UNIQUE(playlist_id, position)`
  - (Opcional) `UNIQUE(playlist_id, video_id)`
- Índexs clau:
  - `videos(center_id)`, `videos(status)`, `videos(type)`, `videos(is_shared_with_other_centers)`, `videos(zone_id)`
  - `playlists(center_id, kind)`
  - `rss_feeds(center_id, is_active)`
  - `rss_rotation_order(center_id, position)`

---

## 6) Notes d’RLS i permisos (esquema general)

Aquest document **no** defineix les policies concretes (millor a `docs/rls-policies.md`), però l’esquema està pensat per a:

- RLS a taules “tenant-owned”: `centers`, `users`, `videos`, `hashtags`, `playlists`, `playlist_items`, `schedule_overrides`, `rss_feeds`, `rss_center_settings`, `rss_rotation_order`, `guest_access_links`.
- Taules globals amb RLS o lectura pública controlada: `zones`, `tags` (normalment read-only per rols no-admin).
- Columnes com `center_id`, `role`, `is_active`, `onboarding_status` faciliten policies simples i eficients.

Annex recomanat:
- `docs/rls-policies.md` amb: SELECT/INSERT/UPDATE/DELETE per rol (`admin_global`, `editor_profe`, `editor_alumne`, `display`) i casos especials (convidat via token).
