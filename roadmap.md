# Roadmap — Publicat

**Data inicial:** 16 desembre 2025  
**Estat actual:** M0 completat (Auth + Landing + Infraestructura)  
**Durada estimada total:** 13-14 setmanes (~3.5 mesos)  
**MVP demo-able:** M6 (Pantalla Principal)

---

## 📊 Visió General

```
M0  ✅ Setup & Auth                    [COMPLETAT]
     └─> Infraestructura + Login + Landing

M1  🔴 Foundation (DB + RLS + Seeds)  [1.5-2 setmanes] CRÍTIC
     ├─> M1.0: Convencions & Contractes
     ├─> M1.1: Schema Core Mínim
     ├─> M1.2: Seguretat Base (RLS)
     ├─> M1.3: Contingut & Classificació
     ├─> M1.4: Playlists (Estructura)
     ├─> M1.5: Automatismes (Triggers)
     ├─> M1.6: Seeds & Dades Demo
     └─> M1.7: Extensions (RSS, Calendari)

M2  🟡 Admin UI                        [1 setmana]
     └─> Gestió centres, usuaris, zones

M3  🟡 Contingut & Moderació           [2 setmanes]
     ├─> M3a: Contingut Base          [1 setmana]
     └─> M3b: Moderació Alumnes       [1 setmana]

M4  🟢 Llistes de Reproducció          [1.5 setmanes]
     └─> Playlist management + drag&drop

M5  🟢 Sistema RSS                     [1.5 setmanes]
     └─> Feeds + validació + rotació

M6  🎯 Pantalla Principal (MVP)        [2 setmanes] DEMO
     └─> 3 zones + Mode Display + Reproducció

M7  🟢 Features Avançades              [2 setmanes]
     └─> Calendari + Landing Playlist + Llistes Globals

M8  🟢 Multi-tenant Avançat            [1.5 setmanes]
     └─> Convidats + Compartició + Auditoria
```

---

## 🎯 Milestones Detallats

### **M0: Setup & Autenticació** ✅ COMPLETAT

**Estat:** Implementat al 100%

**Què s'ha fet:**
- ✅ Next.js 15 + React 19 + TypeScript
- ✅ Supabase (Auth + PostgreSQL)
- ✅ Vercel deployment
- ✅ Login amb email/password
- ✅ Reset password per email
- ✅ Sistema d'invitacions
- ✅ Landing page amb identitat visual
- ✅ Guia d'estil (colors Lacenet, fonts)

**Entregables:**
- Repo GitHub configurat
- Deployment automàtic a Vercel
- Auth flow complet funcional
- Variables d'entorn configurades

---

### **M1: Foundation (DB + RLS + Seeds)** 🔴 CRÍTIC

**Objectiu:** Crear l'estructura completa de base de dades, policies RLS i dades seed per poder desenvolupar la resta de funcionalitats.

**Situació actual:** Base de dades buida (només `auth.users` de Supabase)

**Risc:** 🔴 **MOLT ALT** - Tot el projecte depèn d'aquest milestone. És el bloqueig més gran.

**ESTRATÈGIA: M1 Ultra-Split**

Aquest milestone es divideix en **8 sub-milestones** atòmics per garantir una implementació sòlida i evitar bloquejos de context:

---

#### **M1.0: Convencions & Contractes** 📄 `M1-0-conventions.md`
- Naming conventions (snake_case, plural/singular)
- Tipus base (uuid, timestamptz, soft delete)
- Convenció de `center_id` i multi-tenant global
- Filosofia RLS (deny by default)

#### **M1.1: Schema Core Mínim** 📄 `M1-1-core-schema-min.md`
- Enums (user_role, video_type, etc.)
- Taules: `zones`, `centers`, `users`, `videos` (versió mínima)
- PK, FK, constraints bàsics

#### **M1.2: Seguretat Base (RLS)** 📄 `M1-2-rls-core-min.md`
- RLS per rol (admin, editor, display)
- Aïllament per `center_id`
- Queries de test manual (SELECT AS ROLE)

#### **M1.3: Contingut & Classificació** 📄 `M1-3-content-schema.md`
- Taules: `tags`, `hashtags`, `video_tags`, `video_hashtags`
- Ajustos finals de la taula `videos`

#### **M1.4: Playlists (Estructura)** 📄 `M1-4-playlists-schema.md`
- Taules: `playlists`, `playlist_items`
- Constraints d'ordre i tipus de llista

#### **M1.5: Automatismes (Triggers)** 📄 `M1-5-triggers-core.md`
- `set_updated_at`, `sync_user_email`
- `create_default_playlists_for_center`
- Triggers de notificació de moderació

#### **M1.6: Seeds & Dades Demo** 📄 `M1-6-seeds.md`
- Zonas, Tags globals, Centre demo, Usuaris demo
- Scripts idempotents per a entorn de desenvolupament

#### **M1.7: Extensions Futures** 📄 `M1-7-extended-schema.md`
- Taules RSS, Calendari (`schedule_overrides`)
- Convidats (`guest_access_links`), Audit logs

---

**Criteris d'Acceptació Global M1:**
- [ ] Totes les taules creades i verificades
- [ ] RLS policies testejades amb cada rol
- [ ] Seeds executables i verificables
- [ ] Triggers funcionant correctament
- [ ] **Desbloqueja M2 i M3a completament**

---

### **M2: Admin UI** 🟡

**Objectiu:** Interfície d'administració per gestionar centres, usuaris i zones.

**Durada:** 1 setmana

**Situació actual:** Tenen auth funcional però cap pantalla d'admin

**Entregables:**

**1. Pàgina `/admin/centers`**
- Llistat de centres (taula)
- Crear centre (formulari)
- Editar centre (modal/drawer)
- Desactivar/activar centre
- Upload de logo del centre
- Selector de zona (catàleg controlat)

**2. Pàgina `/admin/users`**
- Llistat d'usuaris globals (taula)
- Filtres: rol, centre, estat (actiu/inactiu)
- Cerca per email
- Crear usuari (formulari + invitació automàtica)
- Editar usuari (rol, centre, estat)
- Reenviar invitació (només si pendent)
- Indicador d'estat d'onboarding

**3. Pàgina `/admin/zones`**
- Llistat de zones (taula)
- Crear zona
- Editar zona
- Activar/desactivar zona

**4. Sistema d'invitació UI**
- Component `InviteUserForm`
- API route `/api/users/invite` (ja documentat)
- API route `/api/users/resend-invite`
- Email templates Supabase configurats ✅ (ja tenen)

**5. Navegació i permisos**
- Sidebar amb "Administració" visible només per `admin_global`
- Middleware verifica rol abans d'accedir
- Feedback visual (toast notifications)

**Components a crear:**
- `CenterForm`
- `UserForm`
- `ZoneForm`
- `CenterLogoUpload`
- `InviteUserButton`
- `DataTable` (genèric reutilitzable)

**Criteris d'Acceptació:**
- [ ] Admin global pot crear/editar centres
- [ ] Admin global pot crear/editar usuaris
- [ ] Sistema d'invitació funciona (email rebut)
- [ ] Reenviar invitació funciona amb cooldown
- [ ] Upload de logo funciona
- [ ] Altres rols NO poden accedir a `/admin/*`

**Dependències:**
- ✅ M1 completat (taules `centers`, `users`, `zones`)
- ✅ Supabase Storage bucket `center-logos` creat

**Risc:** 🟡 Mitjà (depèn de Supabase Storage que no han usat encara)

---

### **M3a: Contingut Base** 🟡

**Objectiu:** Sistema de gestió de vídeos per Editor-profe (sense moderació inicial).

**Durada:** 1 setmana

**Entregables:**

**1. Pàgina `/contingut`**
- Graella de vídeos (cards 24/pàgina)
- Thumbnail de Vimeo
- Metadades: títol, centre, zona, tags, hashtags, durada
- Indicador de tipus (Content/Announcement)
- Indicador de compartició (només centre / compartit)

**2. Filtres**
- Per zona (catàleg global)
- Per tipus (Content/Announcement)
- Per tags globals (selector múltiple)
- Per hashtags del centre (només vídeos del propi centre)
- Checkbox: "Incloure vídeos compartits d'altres centres"
- Ordenació: Data pujada (més recents primer)

**3. CRUD Vídeos**
- **Crear vídeo:** Formulari amb:
  - URL Vimeo (validació API en temps real)
  - Títol (autocompletat des de Vimeo)
  - Descripció
  - Tipus: Content / Announcement
  - Tags globals (mínim 1, màxim N)
  - Hashtags del centre (opcional, crear-los on-the-fly)
  - Permís de compartició (checkbox, només Editor-profe)
  
- **Editar vídeo:** Modal amb mateix formulari

- **Esborrar vídeo:** Confirmació + soft delete

**4. Integració Vimeo**
- API route `/api/vimeo/validate`
- Funció `parseVimeoUrl()` → extreu video_id
- Funció `getVimeoVideoData()` → obté thumbnail, durada, títol
- Validació: vídeo existeix i és accessible
- Gestió d'errors: 404 (no trobat), 403 (privat/password protected)
- Missatge: "Aquest vídeo no és accessible públicament a Vimeo"
- Caché: React Query 5 minuts

**5. Components**
- `VideoCard`
- `VideoForm`
- `VideoGrid`
- `FilterPanel`
- Hook: `useVimeoValidation`

**Simplificacions de M3a:**
- ❌ Sense moderació (tot es publica directament)
- ❌ Sense notificacions
- ✅ Només Editor-profe pot **crear/editar/esborrar** vídeos
- ✅ Editor-alumne pot **visualitzar** vídeos published (només lectura)
- ✅ Editor-alumne NO pot crear vídeos encara (això serà a M3b)

**Criteris d'Acceptació:**
- [ ] Editor-profe pot crear vídeos amb URL Vimeo
- [ ] Validació Vimeo funciona (thumbnail + metadades)
- [ ] Filtres funcionen correctament
- [ ] Tags i hashtags assignables
- [ ] Editor-profe pot editar/esborrar els seus vídeos
- [ ] Compartició intercentres activable

**Dependències:**
- ✅ M1 completat (taula `videos`, `tags`, `hashtags`)
- ✅ Vimeo API Access Token configurat

**Risc:** 🟡 Mitjà (primera integració amb API externa)

---

### **M3b: Moderació Alumnes** 🟡

**Objectiu:** Permetre que Editor-alumne pugui pujar vídeos que queden pendents d'aprovació per Editor-profe.

**Durada:** 1 setmana

**Entregables:**

**1. Workflow de Moderació**
```
Editor-alumne puja vídeo
    ↓
status = 'pending_approval'
is_shared_with_other_centers = false
    ↓
Editor-profe revisa
    ↓
Aprovar → status = 'published'
Rebutjar → DELETE vídeo
```

**2. Dashboard de Moderació `/moderacio`**
- Llistat de vídeos `pending_approval` del centre
- Targetes amb preview (thumbnail, títol, descripció, autor, data)
- Botons: Aprovar / Rebutjar
- Filtre per data
- Badge al menú lateral amb comptador de pendents

**3. Sistema de Notificacions**
- Taula `notifications` (ja creada a M1)
- Triggers SQL:
  - `notify_pending_video()` → notifica Editor-profe quan hi ha nou vídeo pendent
  - `notify_video_decision()` → notifica Editor-alumne quan s'aprova el seu vídeo
  
- Component `NotificationBadge` a barra superior
- Component `NotificationDropdown` amb llista
- Hook `useNotifications` amb Supabase Realtime
- API routes:
  - `GET /api/notifications`
  - `POST /api/notifications/[id]/read`
  - `POST /api/notifications/read-all`

**4. Permisos actualitzats**
- Editor-alumne pot crear vídeos (queden `pending_approval`)
- Editor-alumne pot veure els seus vídeos pendents (només lectura)
- Editor-alumne NO pot editar ni esborrar cap vídeo (ni pendents ni aprovats)
- Editor-alumne veu vídeos aprovats del centre (només lectura)
- Editor-profe veu tots els vídeos del centre (tots els estats)

**5. Components nous**
- `ModerationDashboard`
- `PendingVideoCard`
- `NotificationBadge`
- `NotificationDropdown`
- Hook: `useNotifications`

**Criteris d'Acceptació:**
- [ ] Editor-alumne pot pujar vídeos (queden pendents)
- [ ] Editor-profe rep notificació in-app
- [ ] Editor-profe pot aprovar des de `/moderacio`
- [ ] Editor-profe pot rebutjar (vídeo s'esborra)
- [ ] Editor-alumne rep notificació quan s'aprova
- [ ] Badge de notificacions funciona amb Realtime
- [ ] Contador de vídeos pendents al menú

**Dependències:**
- ✅ M3a completat
- ✅ Taula `notifications` creada (M1)

**Risc:** 🟡 Mitjà (Supabase Realtime subscriptions)

---

### **M4: Llistes de Reproducció** 🟢

**Objectiu:** Sistema de playlists amb drag&drop per organitzar vídeos.

**Durada:** 1.5 setmanes

**Entregables:**

**1. Tipus de Llistes**
- **Predefinides (7):** Dilluns, Dimarts, Dimecres, Dijous, Divendres, Dissabte, Diumenge, Anuncis
- **Personalitzades:** Creades per Editor-profe
- **Globals:** Creades per Admin global (còpia local per centre)

**2. Pàgina `/llistes`**
- Llistat de totes les llistes del centre (files horitzontals)
- Cada fila mostra:
  - Nom de la llista
  - Tipus (predefinida/personalitzada/global)
  - Nombre de vídeos
  - Botó Editar
  - Botó Eliminar (només personalitzades)
  - Indicador d'assignació al calendari (futur)

**3. Editor de Llista (modal/pàgina)**
- Llista de vídeos actual (ordenada)
- Drag & drop per reordenar (react-beautiful-dnd o dnd-kit)
- Botó "Afegir vídeos" → modal amb filtres
- Botó eliminar vídeo individual
- Botó guardar canvis
- Restricció: Llista "Anuncis" només accepta `type = announcement`
- Si `isStudentEditable = true`: Editor-alumne pot afegir/eliminar/reordenar vídeos
- Si `isStudentEditable = false`: Editor-alumne només pot veure (lectura)

**4. Crear Llista Personalitzada**
- Formulari: Nom + Descripció
- Selector de vídeos amb filtres (reutilitzar de M3a)
- Checkbox `isStudentEditable` (si Editor-alumne pot editar)

**5. Llistes Globals (Admin)**
- Admin global crea llista global (`centerId = null`)
- Quan un centre visualitza llista global → es crea còpia local automàticament
- Centre pot modificar la seva còpia sense afectar altres

**6. Components**
- `PlaylistList`
- `PlaylistEditor`
- `PlaylistForm`
- `DraggableVideoList`
- `AddVideosModal`
- Hook: `usePlaylists`

**Criteris d'Acceptació:**
- [ ] 7 llistes predefinides visibles per defecte (buides)
- [ ] Editor-profe pot crear llistes personalitzades
- [ ] Drag & drop funciona per reordenar vídeos
- [ ] Llista "Anuncis" només accepta announcements
- [ ] Admin global pot crear llistes globals
- [ ] Centres poden copiar i modificar llistes globals
- [ ] isStudentEditable permet edició per alumnes

**Dependències:**
- ✅ M3a completat (vídeos existeixen)
- ✅ Taules `playlists`, `playlist_items` (M1)

**Risc:** 🟢 Baix (funcionalitat estàndard)

---

### **M5: Sistema RSS** 🟢

**Objectiu:** Gestió de feeds RSS amb validació, caché i rotació automàtica.

**Durada:** 1.5 setmanes

**Entregables:**

**1. Pàgina `/rss`**
- Llistat de feeds del centre (taula)
- Columnes: Nom, URL, Actiu, Inclòs a rotació, Última actualització, Estat
- Crear feed (formulari + validació en temps real)
- Editar feed
- Activar/desactivar feed
- Incloure/excloure de rotació

**2. Validació de Feeds**
- API route `/api/rss/validate`
- Parser RSS/Atom (npm: `rss-parser`)
- Validació abans de guardar:
  - URL vàlida
  - Feed accessible
  - Conté ítems
- Preview de 3 primers ítems

**3. Caché de Feeds**
- Taula `rss_items` emmagatzema ítems
- Background job actualitza feeds cada N minuts
- API route `/api/cron/fetch-rss`
- **Cron job via Vercel Cron Jobs** (cada 15 minuts)
- Configuració a `vercel.json`: `"schedule": "*/15 * * * *"`
- Secret token per autenticar cron request (`CRON_SECRET`)
- Control d'errors consecutius (desactivar après 5 errors)

**4. Configuració RSS per Centre**
- Taula `rss_center_settings`:
  - Durada per ítem (15s per defecte)
  - Durada per feed (120s per defecte)
  - Interval d'actualització (60 min per defecte)
- Pàgina `/rss/config` per ajustar timings

**5. Ordre de Rotació**
- Taula `rss_rotation_order` amb posició
- Drag & drop per reordenar feeds

**6. Components**
- `RSSFeedList`
- `RSSFeedForm`
- `RSSConfigForm`
- `RSSRotationOrder`
- Hook: `useRSSFeeds`

**Criteris d'Acceptació:**
- [ ] Validació de feed funciona en temps real
- [ ] Feeds es guarden amb metadades
- [ ] Background job actualitza feeds periòdicament
- [ ] Errors gestionats (retry + desactivació automàtica)
- [ ] Configuració de timings editable
- [ ] Ordre de rotació modificable amb drag&drop

**Dependències:**
- ✅ M1b completat (taules RSS)
- ✅ Cron job configurat (Supabase/Vercel)

**Risc:** 🟡 Mitjà (RSS parsing pot fallar amb feeds malformats)

---

### **M6: Pantalla Principal (MVP)** 🎯 DEMO-ABLE

**Objectiu:** Vista principal amb reproducció de vídeos, anuncis i RSS funcionant. Mode Display per TV.

**Durada:** 2 setmanes

**Importància:** Aquest és el milestone més important. Aquí tens un producte **funcionalment complet** i mostrable.

**Entregables:**

**1. Layout de 3 Zones**
```
┌─────────────────────────────────────────────────┐
│ Barra Superior (logo + logout)                  │
├────┬────────────────────────────────────────────┤
│    │ ZONA PRINCIPAL (60% width, 70% height)     │
│ M  │ Reproductor de vídeo                       │
│ E  │ (Llista del dia)                           │
│ N  │                                             │
│ Ú  ├─────────────────┬──────────────────────────┤
│    │ ZONA ANUNCIS    │ ZONA RSS                 │
│ L  │ (30% w, 30% h)  │ (30% w, 30% h)           │
│ A  │ (loop)          │ (rotació feeds)          │
│ T  │                 │                          │
│ E  │                 │                          │
│ R  │                 │                          │
│ A  │                 │                          │
│ L  │                 │                          │
└────┴─────────────────┴──────────────────────────┘
```

**Proporcions (configurables en futur):**
- Zona Principal: 60% width, 70% height
- Zona Anuncis: 30% width, 30% height (inferior esquerra)
- Zona RSS: 30% width, 30% height (inferior dreta)

**2. Reproductor Principal**
- Component `VimeoPlayer` (iframe embed)
- Selector de llista (dropdown)
- Per defecte: llista del dia de la setmana
- Reproducció seqüencial automàtica (vídeo rere vídeo)
- Controls tipus YouTube (apareixen amb hover en mode editor)

**3. Zona Anuncis**
- Component `AnnouncementsPlayer`
- Reprodueix llista "Anuncis" en bucle
- Autoplay
- Sense controls visibles
- Si està buida: missatge "No hi ha anuncis"

**4. Zona RSS**
- Component `RSSDisplay` (del M5)
- Rotació automàtica segons configuració
- Mostra titular + descripció + imatge
- Indicador de progrés (dots)
- Si no hi ha feeds: missatge "No hi ha RSS configurats"

**5. Mode Display**
- URL: `/pantalla?mode=display` o login amb usuari `display`
- **NO** mostra barra superior ni menú lateral
- **Fullscreen automàtic** en carregar
- **Autoplay** de vídeo principal
- **Sessió persistent** (no logout mai)
- Refresh automàtic de token cada hora

**6. Mode Editor**
- Barra superior + menú lateral visibles
- Botó "Pantalla Completa" (amaga UI temporalment)
- Controls del reproductor visibles
- Pot canviar llista manualment

**7. Navegació i Menú**
- Sidebar amb icones:
  - Pantalla (activa)
  - Contingut
  - Llistes
  - RSS
  - Moderació (si Editor-profe)
  - Administració (si Admin global)
- Indicador visual de secció activa
- Tooltips amb noms

**8. Components**
- `MainLayout` (barra + sidebar + content)
- `VimeoPlayer`
- `AnnouncementsPlayer`
- `RSSDisplay` (ja del M5)
- `Sidebar`
- `TopBar`
- Hook: `useDisplayMode`

**Criteris d'Acceptació:**
- [ ] 3 zones visibles i funcionals
- [ ] Reproductor principal reprodueix llista del dia
- [ ] Selector de llista funciona
- [ ] Zona anuncis reprodueix en loop
- [ ] Zona RSS rota feeds automàticament
- [ ] Mode Display funciona (fullscreen + autoplay)
- [ ] Sessió Display persistent
- [ ] Mode editor permet navegació
- [ ] Botó fullscreen funciona
- [ ] **Uptime Display mode:** >99% durant 48h contínues
- [ ] **Temps càrrega pantalla:** <2s
- [ ] **Errors JS:** 0 errors crítics en consola
- [ ] **Reproducció vídeos:** >95% èxit (sense 404/403)

**Dependències:**
- ✅ M3a completat (vídeos)
- ✅ M4 completat (llistes)
- ✅ M5 completat (RSS)

**Risc:** 🟡 Mitjà (sincronització de 3 zones en temps real)

---

### **M7: Features Avançades** 🟢

**Objectiu:** Calendari de llistes, Landing Playlist i Llistes Globals.

**Durada:** 2 setmanes

**Entregables:**

**1. Calendari de Llistes (ScheduleOverride)**
- Pàgina `/llistes/calendari`
- Vista calendari (mes)
- Click en dia → assignar llista
- Guardar planificació
- Lògica: Si dia té assignació → usa assignació, sinó → usa llista per defecte del dia
- Afecta reproductor principal

**2. Landing Playlist**
- Pàgina `/admin/landing-playlist`
- Llista única gestionada per Admin global
- Només pot contenir vídeos amb `isSharedWithOtherCenters = true`
- Drag & drop per reordenar
- Afegir/eliminar vídeos
- Si vídeo passa a `isShared = false` → es retira automàticament

**3. Llistes Globals (completar funcionalitat)**
- Admin global crea llista global
- Centres visualitzen i creen còpia local
- Botó "Restaurar a versió global" (opcional)

**4. Millores UI**
- Sidebar col·lapsable (només icones en mode compacte)
- Animacions de transició amb framer-motion
- Breadcrumbs per navegació (`Admin > Centres > Editar Centre X`)
- Millores de responsive (funciona en tablet/móvil)
- Feedback visual millorat (toasts, loading states)
- Dark mode (opcional, baix prioritat)

**Criteris d'Acceptació:**
- [ ] Calendari permet assignar llistes per data
- [ ] Llista del dia respecta assignacions del calendari
- [ ] Landing Playlist editable per Admin global
- [ ] Landing Playlist respecta regla de `isShared = true`
- [ ] Llistes globals completament funcionals

**Dependències:**
- ✅ M4 completat (llistes)
- ✅ M6 completat (pantalla principal)
- ✅ Taula `schedule_overrides` (M1)

**Risc:** 🟢 Baix

---

### **M8: Multi-tenant Avançat** 🟢

**Objectiu:** Convidats temporals, compartició intercentres i auditoria.

**Durada:** 1.5 setmanes

**Entregables:**

**1. Convidats Temporals**
- Pàgina `/admin/guests`
- Admin global crea enllaç temporal
- Formulari: Centre, Nom convidat, Caducitat (per defecte 7 dies)
- Genera enllaç únic: `/guest/[token]`
- Convidat accedeix sense login
- Només veu contingut `published` del centre
- Mode només lectura

**2. Compartició Intercentres**
- Filtres al contingut mostren vídeos compartits d'altres centres
- Indicador visual de "vídeo compartit"
- Editor-profe pot activar/desactivar compartició
- Landing Playlist pot incloure vídeos compartits

**3. Usuaris del Centre (Editor-profe)**
- Pàgina `/usuaris` (només Editor-profe)
- Llistat d'usuaris del seu centre
- Crear usuaris del centre (Editor-profe, Editor-alumne, Display)
- Activar/desactivar usuaris
- Reenviar invitació
- Restricció: No pot deixar el centre sense cap Editor-profe actiu

**4. Auditoria i Supervisió**
- Pàgina `/admin/auditoria`
- Històric d'aprovacions (qui va aprovar què)
- Logs d'accions crítiques (crear centre, canviar rol)
- Exportació CSV

**5. Millores de Seguretat**
- Verificació addicional de RLS
- Logs d'errors
- Alertes per accessos sospitosos

**Criteris d'Acceptació:**
- [ ] Admin global pot crear enllaços temporals
- [ ] Convidats poden accedir sense login
- [ ] Enllaços caduquen correctament
- [ ] Convidats només veuen contingut publicat
- [ ] Compartició intercentres funciona als filtres
- [ ] Editor-profe pot gestionar usuaris del centre
- [ ] Històric d'auditoria accessible

**Dependències:**
- ✅ M3a completat (contingut)
- ✅ M6 completat (pantalla)
- ✅ Taula `guest_access_links` (M1)

**Risc:** 🟢 Baix

---

## 📅 Timeline Estimat

### **Opció B: Amb Ultra-Split de M1 (RECOMANAT)**

| Milestone | Durada | Setmanes Acumulades | Notes |
|-----------|--------|---------------------|-------|
| M0: Setup ✅ | COMPLETAT | 0 | - |
| M1.0 - M1.2 | 3 dies | 0.5 | Convencions, Core Schema, RLS |
| M1.3 - M1.6 | 4 dies | 1 | Contingut, Playlists, Triggers, Seeds |
| M2 + M1.7 (paral·lel) | 1 setmana | 2 | Admin UI + Extensions (RSS, etc.) |
| M3a: Contingut Base | 1 setmana | 3 | - |
| M3b: Moderació | 1 setmana | 4 | - |
| M4: Llistes | 1.5 setmanes | 5.5 | - |
| M5: RSS | 1.5 setmanes | 7 | Requereix M1.7 |
| M6: Pantalla Principal 🎯 | 2 setmanes | **9** | ← **MVP Demo** |
| M7: Features Avançades | 2 setmanes | 11 | - |
| M8: Multi-tenant | 1.5 setmanes | **12.5** | ← **Complet** |

**Total:** ~12.5 setmanes (~3 mesos)

**Guany:** 1 setmana (però més risc)

---

### **Opció A: Seqüencial (més segur, no recomanat)**

| Milestone | Durada | Setmanes Acumulades |
|-----------|--------|---------------------|
| M0: Setup ✅ | COMPLETAT | 0 |
| M1: Foundation | 1.5-2 setmanes | 2 |
| M2: Admin UI | 1 setmana | 3 |
| M3a: Contingut Base | 1 setmana | 4 |
| M3b: Moderació | 1 setmana | 5 |
| M5: RSS | 1.5 setmanes | 6.5 |
| M4: Llistes | 1.5 setmanes | 8 |
| M6: Pantalla Principal 🎯 | 2 setmanes | **10** ← MVP Demo |
| M7: Features Avançades | 2 setmanes | 12 |
| M8: Multi-tenant | 1.5 setmanes | **13.5** ← Completo |

**Total:** ~12.5 setmanes (~3 mesos)

**Guany:** 1 setmana respecte Opció A

---

### **Opció A: Seqüencial (més segur, no recomanat)**

| Milestone | Durada | Setmanes Acumulades |
|-----------|--------|---------------------|
| M0: Setup ✅ | COMPLETAT | 0 |
| M1: Foundation Complet | 1.5-2 setmanes | 2 |
| M2: Admin UI | 1 setmana | 3 |
| M3a: Contingut Base | 1 setmana | 4 |
| M3b: Moderació | 1 setmana | 5 |
| M4: Llistes | 1.5 setmanes | 6.5 |
| M5: RSS | 1.5 setmanes | 8 |
| M6: Pantalla Principal 🎯 | 2 setmanes | **10** | ← **MVP Demo** |
| M7: Features Avançades | 2 setmanes | 12 |
| M8: Multi-tenant | 1.5 setmanes | **13.5** | ← **Complet** |

**Total:** ~13.5 setmanes (~3.5 mesos)

**Desavantatge:** Més lent, bloqueja desenvolupament

---

## 🎯 Hites Clau (Demo Milestones)

### **🟢 Demo 1: Admin Funcional (M2)**
**Setmana 3**
- Mostrar gestió de centres i usuaris
- Sistema d'invitació funcional
- Zones gestionables

### **🟡 Demo 2: Contingut & Moderació (M3b)**
**Setmana 5**
- Alta de vídeos amb Vimeo
- Flux de moderació complet
- Notificacions en temps real

### **🟠 Demo 3: RSS & Llistes (M4)**
**Setmana 8**
- Feeds RSS mostrant-se amb rotació
- Playlists funcionals amb drag&drop

### **🎯 Demo 4: MVP Complet (M6)**
**Setmana 10** ← **MILESTONE CRÍTIC**
- Pantalla principal amb 3 zones funcionant
- Mode Display en TV real
- Producte demo-able a stakeholders

### **🚀 Demo 5: Producte Complet (M8)**
**Setmana 13.5**
- Totes les funcionalitats implementades
- Llest per producció

---

## ⚠️ Riscos i Mitigacions

| Risc | Probabilitat | Impacte | Mitigació |
|------|--------------|---------|-----------|
| **M1 s'allarga** | 🔴 Alta | 🔴 Molt alt | Split en M1a/M1b per desbloquejar M2 |
| **Vimeo API canvia** | 🟡 Mitjana | 🟡 Mitjà | Abstraure en lib separada + tests |
| **RSS feeds malformats** | 🟡 Mitjana | 🟢 Baix | Parser robust + gestió d'errors |
| **Supabase Realtime lent** | 🟢 Baixa | 🟡 Mitjà | Polling fallback + caché |
| **Sincronització 3 zones M6** | 🟡 Mitjana | 🟡 Mitjà | Desenvolupar zones per separat primer |
| **RLS policies incorrectes** | 🟡 Mitjana | 🔴 Alt | Tests exhaustius per cada rol + script de validació automàtica |
| **Mode Display inestable** | 🟢 Baixa | 🟡 Mitjà | Refresh automàtic + error recovery |

---

## 📊 Mètriques de Progrés

### **Criteris d'Èxit Global**

**M6 (MVP):**
- [ ] Usuari Display pot veure pantalla en TV 24/7
- [ ] Vídeos es reprodueixen automàticament
- [ ] Anuncis roten en bucle
- [ ] RSS mostra notícies actualitzades
- [ ] Editor-profe pot gestionar tot el contingut
- [ ] Sistema de moderació funcional

**M8 (Complet):**
- [ ] Multi-tenant complet (**5+ centres** actius)
- [ ] Compartició intercentres funciona
- [ ] Convidats temporals accessibles
- [ ] Calendari de llistes operatiu
- [ ] Auditoria i logs complets
- [ ] Zero errors crítics en producció
- [ ] **100+ vídeos** pujats i aprovats
- [ ] **10+ llistes** personalitzades creades
- [ ] **RSS feeds:** >10 feeds actius sense errors
- [ ] **Performance:** Temps resposta API <200ms (p95)

---

## 🔄 Procés de Validació per Milestone

**Per cada milestone:**

1. **Planning** (inici de setmana)
   - Review de document `M{n}-{nom}.md`
   - Clarificar dubtes tècnics
   - Estimar tasques

2. **Desenvolupament** (durant setmana)
   - Commits diaris
   - Tests unitaris/integració
   - Deploy a preview (Vercel)

3. **Review** (final de setmana)
   - Verificar criteris d'acceptació
   - Demo interna
   - Documentar aprenentatges

4. **Sign-off** (abans de següent milestone)
   - Stakeholder approval
   - Deploy a producció
   - Actualitzar roadmap si cal

---

## 📝 Pròxims Passos

1. **Crear documents de milestone (Ultra-Split):**
   - `M1-0-conventions.md`
   - `M1-1-core-schema-min.md`
   - `M1-2-rls-core-min.md`
   - ... etc.

2. **Configurar entorn:**
   - Vimeo API Access Token
   - Supabase Storage buckets
   - Cron jobs (Vercel/Supabase)

3. **Començar M1.0:**
   - Definir convencions de naming i tipus
   - Establir contracte multi-tenant
   - Validar amb l'equip

---

**Data d'actualització:** 23 desembre 2025  
**Estat:** Roadmap definit amb estratègia M1 Ultra-Split, pendent inici M1.0  
**Recomanació:** Utilitzar Opció B (Ultra-Split) per a una implementació més controlada i modular.
