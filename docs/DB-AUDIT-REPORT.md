# Informe d'Auditoria de Base de Dades - PUBLI*CAT
**Data:** 2026-01-19
**Revisor:** Claude Code (Anàlisi automàtica)
**Base de dades:** Supabase PostgreSQL

---

## 📋 Resum Executiu

✅ **ESTAT GENERAL: CORRECTE**

La base de dades està ben estructurada, amb:
- 18 migracions aplicades correctament
- Esquema multi-tenant amb RLS actiu
- Relacions i constraints ben definides
- Triggers funcionals per automatització
- Índexs optimitzats per rendiment

### Problemes Resolts Avui
- ✅ **Fix #1**: Visibilitat de centres/zones en videos compartits (migració 20260119010000)

---

## 🗂️ Estructura de Taules

### 1. Taules Core

#### **zones**
*Catàleg global de zones geogràfiques*

| Columna | Tipus | Constraints |
|---------|-------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() |
| name | text | NOT NULL, UNIQUE |
| is_active | boolean | NOT NULL, DEFAULT true |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

**Índexs:**
- Implícit per UNIQUE(name)

**RLS:**
- ✅ SELECT: Permís total per authenticated (`USING (true)`)
- ✅ ALL: Només admin_global

---

#### **centers**
*Centres educatius (tenants del sistema)*

| Columna | Tipus | Constraints |
|---------|-------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() |
| name | text | NOT NULL |
| zone_id | uuid | NOT NULL, FK → zones(id) ON DELETE RESTRICT |
| logo_url | text | NULL |
| is_active | boolean | NOT NULL, DEFAULT true |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

**Índexs:**
- idx_centers_zone_id

**RLS:**
- ✅ SELECT: Permís total per authenticated (`USING (true)`) ← **FIX aplicat avui**
- ✅ ALL: Només admin_global

**Triggers:**
- ✅ tr_center_default_playlists: Crea playlists per defecte (7 dies + Anuncis)
- ✅ tr_centers_updated_at: Actualitza updated_at

---

#### **users**
*Perfils d'usuaris de l'aplicació*

| Columna | Tipus | Constraints |
|---------|-------|-------------|
| id | uuid | PRIMARY KEY, FK → auth.users(id) ON DELETE CASCADE |
| email | text | NOT NULL, UNIQUE |
| role | user_role | NOT NULL (enum: admin_global, editor_profe, editor_alumne, display) |
| center_id | uuid | FK → centers(id) ON DELETE RESTRICT |
| full_name | text | NULL |
| phone | text | NULL |
| onboarding_status | onboarding_status | NOT NULL, DEFAULT 'invited' (enum: invited, active, disabled) |
| is_active | boolean | NOT NULL, DEFAULT true |
| invited_at | timestamptz | NULL |
| last_invitation_sent_at | timestamptz | NULL |
| activated_at | timestamptz | NULL |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |
| created_by_user_id | uuid | FK → users(id) ON DELETE SET NULL |

**Constraint CHECK:**
```sql
(role = 'admin_global') OR (role <> 'admin_global' AND center_id IS NOT NULL)
```
✅ Admin global pot tenir o no centre (modificació 20250107)

**Índexs:**
- idx_users_center_id
- idx_users_role

**RLS:**
- ✅ SELECT: Usuaris del mateix centre + admin_global
- ✅ ALL: Admin_global + editor_profe (només del seu centre)

**Triggers:**
- ✅ tr_assign_lacenet_to_admin: Assigna automàticament Centre Lacenet a nous admin_global
- ✅ tr_auth_user_email_sync: Sincronitza email des d'auth.users
- ✅ tr_users_updated_at: Actualitza updated_at

---

#### **videos**
*Contingut audiovisual de Vimeo*

| Columna | Tipus | Constraints |
|---------|-------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() |
| center_id | uuid | NOT NULL, FK → centers(id) ON DELETE RESTRICT |
| zone_id | uuid | FK → zones(id) ON DELETE RESTRICT |
| title | text | NOT NULL |
| description | text | NULL |
| type | video_type | NOT NULL, DEFAULT 'content' (enum: content, announcement) |
| status | video_status | NOT NULL, DEFAULT 'pending_approval' (enum: pending_approval, published) |
| vimeo_url | text | NOT NULL |
| vimeo_id | text | NULL (extret automàticament) |
| vimeo_hash | text | NULL (per vídeos unlisted) |
| duration_seconds | int | NULL |
| thumbnail_url | text | NULL |
| uploaded_by_user_id | uuid | NOT NULL, FK → users(id) ON DELETE RESTRICT |
| approved_by_user_id | uuid | FK → users(id) ON DELETE SET NULL |
| approved_at | timestamptz | NULL |
| is_shared_with_other_centers | boolean | NOT NULL, DEFAULT false |
| shared_by_user_id | uuid | FK → users(id) ON DELETE SET NULL |
| shared_at | timestamptz | NULL |
| is_active | boolean | NOT NULL, DEFAULT true |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

**Índexs:**
- idx_videos_center_id
- idx_videos_zone_id
- idx_videos_status
- idx_videos_vimeo_id
- idx_videos_shared (índex parcial: WHERE is_shared_with_other_centers = true)
- ✅ idx_videos_center_shared_active (añadido hoy: center_id, is_shared, is_active)

**RLS:**
- ✅ SELECT: Vídeos del propi centre + vídeos compartits + admin_global
- ✅ ALL: Vídeos del propi centre + admin_global

**Triggers:**
- ✅ tr_video_pending_notification: Notifica editors quan hi ha vídeo pendent
- ✅ tr_videos_updated_at: Actualitza updated_at

---

### 2. Taules de Classificació

#### **tags**
*Etiquetes globals (controlades)*

| Columna | Tipus | Constraints |
|---------|-------|-------------|
| id | uuid | PRIMARY KEY |
| name | text | NOT NULL, UNIQUE |
| is_active | boolean | NOT NULL, DEFAULT true |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

**RLS:**
- ✅ SELECT: Tots els usuaris authenticated
- ✅ ALL: Només admin_global

---

#### **hashtags**
*Etiquetes per centre (lliures)*

| Columna | Tipus | Constraints |
|---------|-------|-------------|
| id | uuid | PRIMARY KEY |
| center_id | uuid | NOT NULL, FK → centers(id) ON DELETE CASCADE |
| name | text | NOT NULL |
| is_active | boolean | NOT NULL, DEFAULT true |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

**UNIQUE:** (center_id, name)

**RLS:**
- ✅ SELECT: Hashtags del propi centre + admin_global
- ✅ ALL: editor_profe + admin_global (del seu centre)

---

### 3. Taules de Relació N-M

#### **video_tags**
*Relació vídeos ↔ tags*

| Columna | Tipus | Constraints |
|---------|-------|-------------|
| video_id | uuid | NOT NULL, FK → videos(id) ON DELETE CASCADE |
| tag_id | uuid | NOT NULL, FK → tags(id) ON DELETE RESTRICT |

**PRIMARY KEY:** (video_id, tag_id)

**Índexs:**
- idx_video_tags_tag_id

**RLS:**
- ✅ Hereta permisos del vídeo associat

---

#### **video_hashtags**
*Relació vídeos ↔ hashtags*

| Columna | Tipus | Constraints |
|---------|-------|-------------|
| video_id | uuid | NOT NULL, FK → videos(id) ON DELETE CASCADE |
| hashtag_id | uuid | NOT NULL, FK → hashtags(id) ON DELETE CASCADE |

**PRIMARY KEY:** (video_id, hashtag_id)

**Índexs:**
- idx_video_hashtags_hashtag_id

**RLS:**
- ✅ Hereta permisos del vídeo associat

---

### 4. Taules de Playlists

#### **playlists**
*Llistes de reproducció*

| Columna | Tipus | Constraints |
|---------|-------|-------------|
| id | uuid | PRIMARY KEY |
| center_id | uuid | FK → centers(id) ON DELETE CASCADE (NULL per globals) |
| name | text | NOT NULL |
| kind | playlist_kind | NOT NULL (enum: weekday, announcements, custom, global, landing) |
| is_deletable | boolean | NOT NULL, DEFAULT true |
| is_student_editable | boolean | NOT NULL, DEFAULT false |
| origin_playlist_id | uuid | FK → playlists(id) ON DELETE RESTRICT (per còpies locals) |
| created_by_user_id | uuid | FK → users(id) ON DELETE SET NULL |
| is_active | boolean | NOT NULL, DEFAULT true |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

**Triggers:**
- ✅ tr_playlists_updated_at

---

#### **playlist_items**
*Elements dins de playlists*

| Columna | Tipus | Constraints |
|---------|-------|-------------|
| id | uuid | PRIMARY KEY |
| playlist_id | uuid | NOT NULL, FK → playlists(id) ON DELETE CASCADE |
| video_id | uuid | NOT NULL, FK → videos(id) ON DELETE CASCADE |
| position | int | NOT NULL |
| added_at | timestamptz | NOT NULL, DEFAULT now() |
| added_by_user_id | uuid | FK → users(id) ON DELETE SET NULL |

**UNIQUE:** (playlist_id, position)

---

### 5. Taula de Notificacions

#### **notifications**
*Notificacions d'usuaris*

| Columna | Tipus | Constraints |
|---------|-------|-------------|
| id | uuid | PRIMARY KEY |
| user_id | uuid | NOT NULL, FK → users(id) ON DELETE CASCADE |
| type | text | NOT NULL (ex: video_pending, video_approved) |
| title | text | NOT NULL |
| message | text | NOT NULL |
| video_id | uuid | FK → videos(id) ON DELETE CASCADE |
| is_read | boolean | NOT NULL, DEFAULT false |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

**RLS:**
- ✅ SELECT: Només les pròpies notificacions (user_id = auth.uid())

---

## 🔒 Resum de Polítiques RLS

### Taules amb RLS Actiu
✅ Totes les taules principals tenen RLS actiu

### Polítiques per Taula

| Taula | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| **zones** | Tots | Admin | Admin | Admin |
| **centers** | Tots ✓ | Admin | Admin | Admin |
| **users** | Mateix centre + Admin | Admin + Editor | Admin + Editor | Admin |
| **videos** | Centre + Compartits | Centre | Centre | Centre |
| **tags** | Tots | Admin | Admin | Admin |
| **hashtags** | Centre | Centre editors | Centre editors | Centre editors |
| **video_tags** | Hereta video | Hereta video | Hereta video | Hereta video |
| **video_hashtags** | Hereta video | Hereta video | Hereta video | Hereta video |
| **notifications** | Propis | - | - | - |

**Nota:** "Centre" significa que l'usuari només pot accedir als registres del seu centre (o tots si és admin_global)

---

## 🔗 Mapa de Relacions (Foreign Keys)

```
zones
  ↓ (zone_id)
centers ← (created by) users
  ↓ (center_id)
users ← (created_by) users
  ↓ (center_id, uploaded_by)
videos
  ├─ (video_id) → video_tags ← (tag_id) ─ tags
  ├─ (video_id) → video_hashtags ← (hashtag_id) ─ hashtags
  ├─ (video_id) → playlist_items ← (playlist_id) ─ playlists
  └─ (video_id) → notifications ← (user_id) ─ users
```

### Regles de Cascada

| Taula | Columna | Referència | ON DELETE |
|-------|---------|------------|-----------|
| centers | zone_id | zones | RESTRICT |
| users | id | auth.users | CASCADE |
| users | center_id | centers | RESTRICT |
| users | created_by_user_id | users | SET NULL |
| videos | center_id | centers | RESTRICT |
| videos | zone_id | zones | RESTRICT |
| videos | uploaded_by_user_id | users | RESTRICT |
| videos | approved_by_user_id | users | SET NULL |
| videos | shared_by_user_id | users | SET NULL |
| hashtags | center_id | centers | CASCADE |
| video_tags | video_id | videos | CASCADE |
| video_tags | tag_id | tags | RESTRICT |
| video_hashtags | video_id | videos | CASCADE |
| video_hashtags | hashtag_id | hashtags | CASCADE |
| playlist_items | playlist_id | playlists | CASCADE |
| playlist_items | video_id | videos | CASCADE |
| notifications | user_id | users | CASCADE |
| notifications | video_id | videos | CASCADE |

✅ **CORRECTE:** Les cascades estan ben configurades per mantenir integritat referencial

---

## ⚡ Triggers i Funcions

### Funcions Implementades

#### 1. **set_updated_at()**
- **Propòsit:** Actualitza automàticament el camp `updated_at`
- **Aplicat a:** zones, centers, users, videos, playlists, tags, hashtags
- **Tipus:** BEFORE UPDATE
- **Estat:** ✅ Funcionant

#### 2. **sync_user_email()**
- **Propòsit:** Sincronitza email de auth.users → public.users
- **Aplicat a:** auth.users
- **Tipus:** AFTER UPDATE OF email
- **Estat:** ✅ Funcionant

#### 3. **assign_lacenet_to_admin_global()**
- **Propòsit:** Assigna automàticament Centre Lacenet a nous admin_global
- **Aplicat a:** users
- **Tipus:** BEFORE INSERT
- **Estat:** ✅ Funcionant

#### 4. **create_default_playlists_for_center()**
- **Propòsit:** Crea 8 playlists per defecte (7 dies + Anuncis)
- **Aplicat a:** centers
- **Tipus:** AFTER INSERT
- **Estat:** ✅ Funcionant

#### 5. **notify_pending_video()**
- **Propòsit:** Notifica editors quan hi ha vídeo pendent d'aprovació
- **Aplicat a:** videos
- **Tipus:** AFTER INSERT
- **Estat:** ✅ Funcionant

### Resum de Triggers

| Trigger | Taula | Event | Funció |
|---------|-------|-------|--------|
| tr_zones_updated_at | zones | UPDATE | set_updated_at() |
| tr_centers_updated_at | centers | UPDATE | set_updated_at() |
| tr_users_updated_at | users | UPDATE | set_updated_at() |
| tr_videos_updated_at | videos | UPDATE | set_updated_at() |
| tr_playlists_updated_at | playlists | UPDATE | set_updated_at() |
| tr_tags_updated_at | tags | UPDATE | set_updated_at() |
| tr_hashtags_updated_at | hashtags | UPDATE | set_updated_at() |
| tr_auth_user_email_sync | auth.users | UPDATE OF email | sync_user_email() |
| tr_assign_lacenet_to_admin | users | INSERT | assign_lacenet_to_admin_global() |
| tr_center_default_playlists | centers | INSERT | create_default_playlists_for_center() |
| tr_video_pending_notification | videos | INSERT | notify_pending_video() |

---

## 📇 Índexs de Rendiment

### Índexs Principals

| Taula | Índex | Columnes | Tipus |
|-------|-------|----------|-------|
| centers | idx_centers_zone_id | zone_id | Standard |
| users | idx_users_center_id | center_id | Standard |
| users | idx_users_role | role | Standard |
| videos | idx_videos_center_id | center_id | Standard |
| videos | idx_videos_zone_id | zone_id | Standard |
| videos | idx_videos_status | status | Standard |
| videos | idx_videos_vimeo_id | vimeo_id | Standard |
| videos | idx_videos_shared | is_shared_with_other_centers | **Partial** (WHERE is_shared = true) |
| videos | idx_videos_center_shared_active | center_id, is_shared, is_active | **Partial** (WHERE is_shared = true AND is_active = true) ✓ |
| video_tags | idx_video_tags_tag_id | tag_id | Standard |
| video_hashtags | idx_video_hashtags_hashtag_id | hashtag_id | Standard |

### Índexs UNIQUE (implícits)

- zones.name
- users.email
- tags.name
- hashtags(center_id, name)
- video_tags(video_id, tag_id)
- video_hashtags(video_id, hashtag_id)
- playlist_items(playlist_id, position)

✅ **CORRECTE:** Els índexs estan ben distribuïts per a les consultes més comunes

---

## 🎯 Enums Definits

### user_role
```sql
'admin_global' | 'editor_profe' | 'editor_alumne' | 'display'
```

### onboarding_status
```sql
'invited' | 'active' | 'disabled'
```

### video_type
```sql
'content' | 'announcement'
```

### video_status
```sql
'pending_approval' | 'published'
```

### playlist_kind
```sql
'weekday' | 'announcements' | 'custom' | 'global' | 'landing'
```

✅ **CORRECTE:** Els enums estan ben definits i cobreixen tots els casos d'ús

---

## 📊 Historial de Migracions

| Data | Migració | Descripció |
|------|----------|------------|
| 2025-12-16 | 20251216124947 | Schema remot inicial |
| 2025-12-23 | M1 (100000-160000) | Milestone 1 complet: Schema core, RLS, triggers, seeds |
| 2025-12-23 | 170000 | Fix RLS users |
| 2025-12-24 | 000000 | Fix onboarding_status |
| 2025-12-24 | 010000 | Add last_invitation_sent_at |
| 2025-01-07 | 000000 | **Fix admin_global + Centre Lacenet** |
| 2026-01-12 | 000000 | Add vimeo_hash |
| 2026-01-12 | 100000 | Cleanup has_completed_onboarding |
| 2026-01-12 | 110000 | Add vimeo_id + índex |
| 2026-01-12 | 120000 | **M3c: Sistema de moderació** |
| 2026-01-19 | 000000 | Fix centers visibility (revertida) |
| 2026-01-19 | 010000 | **Fix centers/zones RLS per JOINs** ✓ |

**Total migracions:** 18

---

## ⚠️ Punts d'Atenció

### 1. ✅ Política Admin Global Centre (RESOLT)
**Problema anterior:** Admin global sense centre provocava errors
**Solució implementada:** Migració 20250107000000
- Modificat constraint per permetre admin_global amb o sense centre
- Trigger automàtic que assigna Centre Lacenet a nous admins globals

### 2. ✅ Visibilitat Centres en Videos Compartits (RESOLT AVUI)
**Problema:** Videos compartits no mostraven informació del centre d'origen
**Solució implementada:** Migració 20260119010000
- Política RLS de centers: SELECT permissiu (`USING (true)`)
- Política RLS de zones: SELECT permissiu (`USING (true)`)
- Seguretat real a nivell de taula videos (qui veu quins vídeos)
- Índex composat optimitzat per consultes de videos compartits

### 3. ⚠️ Playlists RSS (PENDENT)
**Estat:** Taules definides a migració M1 però no implementades a UI
**Taules afectades:**
- rss_feeds
- rss_center_settings
- rss_rotation_order

**Recomanació:** Implementar en Milestone M5

### 4. ⚠️ Sistema de Notificacions (BÀSIC)
**Estat:** Taula `notifications` creada i trigger funcional
**Limitacions actuals:**
- No hi ha UI per veure notificacions
- No hi ha sistema de mark as read implementat
- No hi ha notificacions en temps real (polling necessari)

**Recomanació:** Afegir Supabase Realtime subscriptions en futura milestone

### 5. ℹ️ Constraint de Tags Mínims
**Observació:** El domini especifica "mínim 1 tag per vídeo" però això no està forçat a nivell de BD
**Solució actual:** Validació a nivell d'API (route.ts)
**Recomanació:** Mantenir així (validació d'app) per flexibilitat

---

## ✅ Recomanacions

### Prioritat Alta
- ✅ **RESOLT:** Visibilitat de centres en videos compartits

### Prioritat Mitjana
1. **Índex de text complet per cerca:** Afegir índex GIN per cerques de títol/descripció més ràpides
2. **Archivat soft de vídeos:** Considerar afegir `deleted_at` en lloc d'esborrat físic per auditoria

### Prioritat Baixa
1. **Particions per data:** Si el volum de vídeos creix molt, considerar particions per `created_at`
2. **Materialized views:** Per estadístiques de dashboard (vídeos per centre, etc.)

---

## 📈 Estadístiques de Complexitat

- **Total taules:** 14 (sense comptar auth.users)
- **Total índexs:** 13 (sense comptar PKs i UNIQUEs)
- **Total triggers:** 11
- **Total funcions custom:** 5
- **Total enums:** 5
- **Total foreign keys:** 17
- **Total polítiques RLS:** ~30

---

## 🎯 Conclusió

### ✅ PUNTS FORTS

1. **Arquitectura multi-tenant robusta** amb RLS ben implementat
2. **Integritat referencial garantida** amb FKs i cascades correctes
3. **Automatització intel·ligent** amb triggers per workflows comuns
4. **Índexs optimitzats** per a consultes més freqüents
5. **Separació clara de rols** amb permisos ben definits

### ⚠️ MILLORES FUTURES

1. Sistema de notificacions en temps real (Supabase Realtime)
2. Implementació completa del sistema RSS (M5)
3. UI per gestionar notificacions
4. Índexs de text complet per cerca avançada

### 🚀 ESTAT GENERAL

**Base de dades READY per les següents fases:**
- ✅ M3c: Moderació alumnes (schema implementat)
- 📋 M4: Gestió de playlists (schema implementat)
- 📡 M5: Feeds RSS (schema implementat, falta UI)
- 🖥️ M6: Mode display (schema suportat)

---

**Informe generat:** 2026-01-19
**Revisió següent recomanada:** Després de completar M4 o M5
