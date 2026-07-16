# Changelog - Publicat

## [M1] Foundation - 23 Desembre 2025 ✅

**Durada real:** 1 dia (vs 1.5-2 setmanes estimades)

### Completat
- ✅ M1.1: Schema core (zones, centers, users, videos)
- ✅ M1.2: 8 polítiques RLS (seguretat multi-tenant)
- ✅ M1.3: Sistema etiquetatge (tags, hashtags + compartició)
- ✅ M1.4: Playlists amb creació automàtica (8 per centre)
- ✅ M1.5: 9 triggers + sistema de notificacions
- ✅ M1.6: Seeds (5 zones, 12 tags, 1 centre, 3 usuaris)
- ✅ M1.7: Extensions (RSS, calendari, auditoria, guest access)

### Migracions executades
1. `20251223100000_m1_core_schema.sql` - Enums, zones, centers, users, videos
2. `20251223110000_m1_rls_core.sql` - Polítiques de seguretat RLS
3. `20251223120000_m1_content_schema.sql` - Tags, hashtags, relacions N-M
4. `20251223130000_m1_playlists_schema.sql` - Playlists i playlist_items
5. `20251223140000_m1_triggers_core.sql` - Triggers i taula notifications
6. `20251223150000_m1_seeds.sql` - Dades demo inicials
7. `20251223160000_m1_extended_schema.sql` - Taules RSS, calendari, auditoria

### Estructura creada
**13 taules principals:**
- zones, centers, users, videos
- tags, hashtags, video_tags, video_hashtags
- playlists, playlist_items
- notifications
- rss_feeds, rss_items, rss_center_settings, rss_rotation_order
- schedule_overrides
- guest_access_links
- audit_logs

**4 enums:**
- user_role, onboarding_status, video_status, playlist_kind

**9 triggers automàtics:**
- 7x updated_at (zones, centers, users, videos, playlists, tags, hashtags)
- 1x create_default_playlists_for_center
- 1x notify_pending_video

**Polítiques RLS:** 8 polítiques base + polítiques per taules de contingut

### Usuaris creats
- `shorrill@xtec.cat` - Admin Global
- `ttubio@gmail.com` - Admin Global
- `shorrillo@gmail.com` - Editor Profe (Institut Demo LaceNet)

### Dades demo carregades
- **Zones:** Bages, Terrassa, Moianès, Anoia, Barcelona
- **Tags globals:** World, Espanya, Catalunya, Esports, Meteorologia, STEM-TECH, Efemèrides, Dites i refranys, Curiositats, Música, Arts, Vida al centre
- **Centre demo:** Institut Demo LaceNet (amb 8 playlists automàtiques)

### Aprenentatges
- ✅ Ultra-split (M1.0 a M1.7) va funcionar perfectament per evitar límits de context
- ✅ Les migracions SQL s'executen millor una a una des del Dashboard per validar progressivament
- ✅ Important sincronitzar UUIDs exactes entre auth.users i public.users
- ✅ Els triggers de playlists funcionen correctament (8 playlists per centre nou)

### Bloquejos resolts
- ✅ Config.toml: Keys obsoletes comentades (s3_protocol, analytics, vector, oauth_server)
- ✅ Permisos CLI: Supabase login correcte
- ✅ Centre demo creat correctament enllaçat a zona Bages
- ✅ UUIDs de auth.users sincronitzats amb public.users
- ✅ Triggers de playlists verificats i funcionals

### Pròxims passos (M2)
Començar amb l'Admin Global UI per gestionar zones, tags, centres i usuaris del sistema.

---

## [M0] Setup & Auth - Desembre 2025 ✅

**Completat anteriorment:**
- ✅ Projecte Next.js 15 + TypeScript configurat
- ✅ Supabase Auth integrat
- ✅ Login/logout funcional
- ✅ Estructura de carpetes bàsica
