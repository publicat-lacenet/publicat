# Roadmap — Publicat

**Data inicial:** 16 desembre 2025
**Estat actual:** M6c completat + Revisió Seguretat completada
**Data actualització:** 6 febrer 2026
**Durada estimada total:** 15-16 setmanes (~4 mesos)
**MVP demo-able:** M6 (Pantalla Principal) ✅ COMPLETAT

---

## 📊 Visió General

```
M0  ✅ Setup & Auth                    [COMPLETAT - Desembre 2025]
     └─> Infraestructura + Login + Landing

M1  ✅ Foundation (DB + RLS + Seeds)   [COMPLETAT - Desembre 2025]
     ├─> M1.0: Convencions & Contractes
     ├─> M1.1: Schema Core Mínim
     ├─> M1.2: Seguretat Base (RLS)
     ├─> M1.3: Contingut & Classificació
     ├─> M1.4: Playlists (Estructura)
     ├─> M1.5: Automatismes (Triggers)
     ├─> M1.6: Seeds & Dades Demo
     └─> M1.7: Extensions (RSS, Calendari)

M2  ✅ Admin UI                        [COMPLETAT - Gener 2026]
     └─> Gestió centres, usuaris, zones

M2.5 ✅ Sistema Auth en Layout         [COMPLETAT - Gener 2026]
     └─> Context Provider + Permisos dinàmics

M3  ✅ Sistema de Contingut            [COMPLETAT - Gener 2026] [2.5 setmanes]
     ├─> M3a: Contingut Base (URL)    [1 setmana] ✅
     ├─> M3b: Direct Upload (Tus)     [1 setmana] ✅ NOVA
     └─> M3c: Moderació Alumnes       [0.5 setmanes] ✅

M4  ✅ Llistes de Reproducció          [COMPLETAT - Gener 2026] [1.5 setmanes]
     └─> Playlist management + drag&drop ✅

M5  ✅ Sistema RSS                      [COMPLETAT - Febrer 2026]
     └─> Feeds + validació + rotació

M6  ✅ Pantalla Principal (MVP)         [COMPLETAT - Febrer 2026] 🎯 DEMO
     └─> 3 zones + Mode Display + Reproducció

M6b ✅ Filtre Avançat de Vídeos        [COMPLETAT - Febrer 2026]
     └─> Drawer filtres (tags, hashtags, zones) a /contingut

M6c ✅ Gestió Usuaris del Centre       [COMPLETAT - Febrer 2026]
     └─> CRUD usuaris per Editor-profe (/usuaris)

M7  ✅ Features Avançades              [COMPLETAT - Febrer 2026]
     └─> Calendari + Landing Playlist + Llistes Globals

🔒  ✅ Revisió de Seguretat            [COMPLETAT - 6 Febrer 2026]
     └─> Auditoria completa: RLS, Auth, Secrets, Vimeo, OWASP

M8  🟢 Multi-tenant Avançat            [1.5 setmanes] PENDENT
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

### **M1: Foundation (DB + RLS + Seeds)** ✅ COMPLETAT

**Objectiu:** Crear l'estructura completa de base de dades, policies RLS i dades seed per poder desenvolupar la resta de funcionalitats.

**Estat:** Implementat i auditat (veure DB-AUDIT-REPORT.md del 19-01-2026)

**Data completació:** Desembre 2025 - Gener 2026

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
- [x] Totes les taules creades i verificades (14 taules)
- [x] RLS policies testejades amb cada rol (~30 policies)
- [x] Seeds executables i verificables
- [x] Triggers funcionant correctament (11 triggers)
- [x] **M2 i M3 desbloquejats i completats amb èxit**

**Resultat:** Veure informe complet a `docs/DB-AUDIT-REPORT.md`

---

### **M2: Admin UI** ✅ COMPLETAT

**Objectiu:** Interfície d'administració per gestionar centres, usuaris i zones.

**Durada:** 1 setmana
**Data completació:** Gener 2026

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
- [x] Admin global pot crear/editar centres
- [x] Admin global pot crear/editar usuaris
- [x] Sistema d'invitació funciona (email rebut)
- [x] Reenviar invitació funciona amb cooldown
- [x] Upload de logo funciona
- [x] Altres rols NO poden accedir a `/admin/*`

**Dependències:**
- ✅ M1 completat (taules `centers`, `users`, `zones`)
- ✅ Supabase Storage bucket `center-logos` creat

---

### **M3a: Contingut Base (URL-based)** ✅ COMPLETAT

**Objectiu:** Sistema de gestió de vídeos per Editor-profe amb validació d'URL de Vimeo.

**Durada:** 1 setmana
**Data completació:** 7-12 gener 2026

**⚠️ PRE-REQUISIT TÈCNIC: Sistema d'Autenticació en Layout**

Abans de començar M3a, cal implementar:

**1. Context Provider d'Autenticació** (`app/contexts/AuthContext.tsx`)
- Hook `useAuth()` que retorna `{ user, profile, loading }`
- Llegeix usuari de Supabase: `supabase.auth.getUser()`
- Llegeix perfil de BD: `SELECT * FROM users WHERE id = auth.uid()`
- Gestiona loading states
- Supabase Realtime per actualitzacions de perfil

**2. Integració al Layout** (`app/components/layout/AdminLayout.tsx`)
- Wrapejar amb `<AuthProvider>`
- AppSidebar consumeix `useAuth()` per filtrar items segons `profile.role`
- Eliminar rol hardcoded `'admin_global'`

**3. AppHeader Dinàmic** (`app/components/layout/AppHeader.tsx`)
- Mostrar rol traduït: 
  - `admin_global` → **Admin Global**
  - `editor_profe` → **Editor Professor**
  - `editor_alumne` → **Editor Alumne**
- Inicial de l'avatar dinàmica des de `user.email[0].toUpperCase()`
- (Opcional) Mostrar logo del centre si `profile.center_id` existeix

**4. Protected Routes millor** (`middleware.ts`)
- Verificar rol específic per cada ruta (ja està parcialment implementat)
- Evitar duplicació de queries (Context Provider ja ho fa)

**Criteris d'Acceptació Pre-M3a:**
- [x] `useAuth()` retorna dades reals de l'usuari autenticat
- [x] Sidebar filtra ítems segons `profile.role` real
- [x] Header mostra rol traduït correctament
- [x] Editor-alumne NO veu RSS, Usuaris ni Administració
- [x] Admin Global veu totes les seccions
- [x] Context actualitza automàticament si canvia el rol

**Temps estimat:** 0.5 setmanes (mig sprint abans de M3a)

---

**Entregables M3a:**

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
- [x] Editor-profe pot crear vídeos amb URL Vimeo
- [x] Validació Vimeo funciona (thumbnail + metadades)
- [x] Filtres funcionen correctament
- [x] Tags i hashtags assignables
- [x] Editor-profe pot editar/esborrar els seus vídeos
- [x] Compartició intercentres activable

**Dependències:**
- ✅ M1 completat (taula `videos`, `tags`, `hashtags`)
- ✅ Vimeo API Access Token configurat

**Risc:** 🟡 Mitjà (primera integració amb API externa)

---

### **M3b: Direct Upload (Tus Protocol)** ✅ COMPLETAT - NOVA FUNCIONALITAT

**Objectiu:** Implementar pujada directa de fitxers de vídeo a Vimeo des del formulari utilitzant el protocol Tus (resumable uploads).

**Durada:** 1 setmana
**Data completació:** 12 gener 2026

**Què s'ha implementat:**
- ✅ Component `VideoUploader` amb drag & drop
- ✅ Integració amb Tus protocol per pujades resumables
- ✅ Barra de progrés en temps real
- ✅ API route `/api/vimeo/upload/ticket` per generar upload tickets
- ✅ API route `/api/vimeo/status/[videoId]` per polling d'estat
- ✅ Validació de format (mp4, mov, avi, mkv, webm)
- ✅ Validació de mida (màx 2GB)
- ✅ Cancel·lació d'upload en curs
- ✅ Retry automàtic en errors
- ✅ Vídeos configurats com "unlisted" automàticament
- ✅ Polling fins que Vimeo processa el vídeo i genera thumbnail real

**Components creats:**
- `app/components/videos/VideoUploader.tsx` - Component principal d'upload
- `app/api/vimeo/upload/ticket/route.ts` - Genera tickets Tus
- `app/api/vimeo/status/[videoId]/route.ts` - Comprova estat de processament

**Integració:**
- Toggle al `VideoFormModal` entre "URL de Vimeo" i "Pujar fitxer"
- Metadades autocompletades després de l'upload
- Compatible amb workflow existent

**Dependències:**
- ✅ M3a completat
- ✅ Vimeo Access Token amb scope `upload`
- ✅ Llibreria `tus-js-client` instal·lada

**Risc:** 🟡 Mitjà (gestió de grans fitxers + timeout de processament Vimeo)

---

### **M3c: Moderació Alumnes (Simplificada)** ✅ COMPLETAT

**Objectiu:** Permetre que Editor-alumne pugui pujar vídeos que queden pendents d'aprovació per Editor-profe.

**Durada:** 0.5 setmanes
**Data completació:** 12 gener 2026

**Implementació SIMPLIFICADA** (no requereix pàgina `/moderacio` dedicada):

**1. Workflow de Moderació** ✅
```
Editor-alumne puja vídeo
    ↓
status = 'pending_approval' (automàtic segons rol)
is_shared_with_other_centers = false
    ↓
Editor-profe revisa a /contingut?status=pending
    ↓
Aprovar → status = 'published' (botó verd a VideoCard)
Rebutjar → DELETE vídeo (botó eliminar)
```

**2. Gestió des de `/contingut`** ✅ (NO es crea pàgina `/moderacio`)
- Editor-profe veu TOTS els vídeos (pending + published) a `/contingut`
- Filtre d'estat: "Tots" / "Publicats" / "Pendents d'aprovació"
- Paràmetre URL `?status=pending` per accés directe
- Badge groc "⏳ Pendent" en vídeos pendents
- Botó verd "✓ Aprovar" només visible per editor-profe
- Botó "✏️ Editar" funcional per editar abans d'aprovar
- Botó "✕" per rebutjar (eliminar) amb confirmació

**3. Sistema de Notificacions (BD only)** ✅
- Taula `notifications` creada
- Triggers SQL funcionals:
  - `notify_pending_video()` → crea registre quan alumne puja vídeo
  - `notify_video_approved()` → crea registre quan s'aprova
  - `notify_video_rejected()` → crea registre quan es rebutja
- ❌ NO implementat: UI de notificacions in-app (futur)
- ❌ NO implementat: Supabase Realtime subscriptions (futur)
- ❌ NO implementat: Badge/dropdown de notificacions (futur)

**4. Permisos RLS actualitzats** ✅
- Editor-alumne pot crear vídeos (queden `pending_approval`)
- Editor-alumne veu els seus propis vídeos pendents + tots els publicats del centre
- Editor-alumne NO pot editar ni esborrar vídeos
- Editor-profe veu TOTS els vídeos del centre (pending + published)
- Editor-profe pot editar TOTS els vídeos (incloent pendents)
- Editor-profe pot aprovar vídeos (UPDATE status → 'published')
- Editor-profe pot rebutjar (DELETE) vídeos pendents

**5. Components actualitzats** ✅
- `VideoCard` - Afegit badge "Pendent" i botó "Aprovar"
- `page.tsx` (`/contingut`) - Afegit filtre d'estat i funció `handleApprove`
- `AuthContext` - Context global d'autenticació per detectar rol correctament
- Migració SQL `20260112120000_m3c_moderation_system.sql` - RLS + triggers

**Criteris d'Acceptació:**
- [x] Editor-alumne pot pujar vídeos (queden pendents)
- [x] Editor-profe veu vídeos pendents amb badge groc
- [x] Editor-profe pot aprovar des de `/contingut?status=pending`
- [x] Editor-profe pot rebutjar (vídeo s'esborra)
- [x] Editor-profe pot editar vídeos pendents abans d'aprovar
- [x] Triggers SQL creen notificacions a la BD
- [x] RLS policies permeten accés correcte segons rol
- [ ] UI de notificacions in-app (PENDENT - futur)
- [ ] Badge amb comptador de notificacions (PENDENT - futur)
- [ ] Realtime subscriptions (PENDENT - futur)

**Dependències:**
- ✅ M3a completat
- ✅ M3b completat (upload directe disponible per alumnes)
- ✅ Taula `notifications` creada (M1)
- ✅ AuthContext implementat

**Risc:** 🟢 Baix (implementació simplificada sense Realtime)

---

### **M4: Llistes de Reproducció** ✅ COMPLETAT

**Objectiu:** Sistema de playlists amb drag&drop per organitzar vídeos.

**Durada:** 1.5 setmanes
**Estat:** COMPLETAT (19 Gener 2026)

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

### **M5: Sistema RSS** ✅ COMPLETAT

**Objectiu:** Gestió de feeds RSS amb validació, caché i rotació automàtica.

**Durada:** 1.5 setmanes
**Data completació:** Febrer 2026

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
- [x] Validació de feed funciona en temps real
- [x] Feeds es guarden amb metadades
- [x] Background job actualitza feeds periòdicament
- [x] Errors gestionats (retry + desactivació automàtica)
- [x] Configuració de timings editable
- [x] Ordre de rotació modificable amb drag&drop
- [x] Compactació de posicions de rotació en toggle/delete de feeds

**Dependències:**
- ✅ M1b completat (taules RSS)
- ✅ Cron job configurat (Supabase/Vercel)

**Risc:** 🟡 Mitjà (RSS parsing pot fallar amb feeds malformats)

---

### **M6: Pantalla Principal (MVP)** ✅ COMPLETAT

**Objectiu:** Vista principal amb reproducció de vídeos, anuncis i RSS funcionant. Mode Display per TV.

**Durada:** 2 setmanes
**Data completació:** Febrer 2026

**Importància:** Aquest és el milestone més important. Aquí tens un producte **funcionalment complet** i mostrable.

**Entregables:**

**1. Layout de 3 Zones**
```
┌─────────────────────────────────────────────────────────────┐
│ Barra Superior (logo + logout)                              │
├────┬──────────────────────────────────┬─────────────────────┤
│    │                                  │ ZONA ANUNCIS        │
│ M  │                                  │ (30% width, 50% h)  │
│ E  │   ZONA PRINCIPAL                 │ (loop automàtic)    │
│ N  │   (70% width, 100% height)       │                     │
│ Ú  │   Reproductor de vídeo           ├─────────────────────┤
│    │   (Llista del dia)               │ ZONA RSS            │
│ L  │                                  │ (30% width, 50% h)  │
│ A  │                                  │ (rotació feeds)     │
│ T  │                                  │                     │
│ E  │                                  │                     │
│ R  │                                  │                     │
│ A  │                                  │                     │
│ L  │                                  │                     │
└────┴──────────────────────────────────┴─────────────────────┘
```

**Proporcions (configurables en futur):**
- Zona Principal: 70% width, 100% height de l'àrea de contingut
- Columna dreta: 30% width, dividida verticalment:
  - Zona Anuncis: 30% width, 50% height (dalt)
  - Zona RSS: 30% width, 50% height (baix)

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
- [x] 3 zones visibles i funcionals
- [x] Reproductor principal reprodueix llista del dia
- [x] Selector de llista funciona
- [x] Zona anuncis reprodueix en loop
- [x] Zona RSS rota feeds automàticament
- [x] Mode Display funciona (fullscreen + autoplay)
- [x] Sessió Display persistent
- [x] Mode editor permet navegació
- [x] Botó fullscreen funciona
- [x] Loop de vídeo únic a playlist (Vimeo native loop)
- [x] Fallback autoplay amb mute + botó "Activar àudio" quan browser bloqueja
- [ ] **Uptime Display mode:** >99% durant 48h contínues (pendent validació)
- [ ] **Temps càrrega pantalla:** <2s (pendent validació)
- [ ] **Errors JS:** 0 errors crítics en consola (pendent validació)
- [ ] **Reproducció vídeos:** >95% èxit (pendent validació)

**Dependències:**
- ✅ M3a completat (vídeos)
- ✅ M4 completat (llistes)
- ✅ M5 completat (RSS)

**Risc:** 🟡 Mitjà (sincronització de 3 zones en temps real)

---

### **M6b: Filtre Avançat de Vídeos** 🎯 SEGÜENT

**Objectiu:** Sistema de filtratge complet per tags globals i hashtags del centre, reutilitzable a `/contingut` i al modal "Afegir vídeos a la llista".

**Durada:** 1 setmana

**Entregables:**

**1. Component `FilterDrawer` (drawer lateral dret)**
- Panel que es desplega des de la dreta amb un botó "Filtrar"
- Inclou tots els filtres de vídeos:
  - Tags globals (selector múltiple amb badges)
  - Hashtags del centre (selector múltiple amb badges)
  - Zona (selector)
  - Tipus (Content / Announcement)
  - Estat (Tots / Publicats / Pendents)
  - Checkbox "Incloure vídeos compartits d'altres centres"
- Botó "Netejar filtres" per reinicialitzar
- Comptador de filtres actius visible al botó d'obertura
- Disseny responsive (drawer en mòbil, panel lateral en desktop)

**2. Integració a `/contingut`**
- Mantenir filtres existents a la part superior (cerca per títol, filtres ràpids)
- Afegir botó "Filtrar" que obre el `FilterDrawer` amb tags i hashtags
- Els filtres del drawer s'apliquen en combinació amb els existents
- URL params per persistir filtres actius (deep-linking)

**3. Integració a `AddVideosModal` (Llistes de reproducció)**
- Afegir botó "Filtrar" dins del modal d'afegir vídeos
- Obre el `FilterDrawer` amb els mateixos filtres
- Respecta restriccions existents (ex: llista Anuncis només mostra `type = announcement`)
- Permet trobar vídeos ràpidament entre un catàleg gran

**4. API: Suport de filtres per tags/hashtags**
- Verificar que `GET /api/videos` accepta paràmetres `tags[]` i `hashtags[]`
- Filtrar via joins amb `video_tags` i `video_hashtags`
- Combinar filtres amb AND (un vídeo ha de tenir TOTS els tags seleccionats)

**5. Components**
- `FilterDrawer` — Component drawer reutilitzable
- `TagFilter` — Selector múltiple de tags globals
- `HashtagFilter` — Selector múltiple de hashtags del centre
- Hook: `useVideoFilters` — Gestió d'estat dels filtres

**Criteris d'Acceptació:**
- [ ] Drawer de filtres s'obre i tanca correctament
- [ ] Filtrar per tags globals funciona a `/contingut`
- [ ] Filtrar per hashtags del centre funciona a `/contingut`
- [ ] Filtres combinats (tags + hashtags + zona + tipus) funcionen
- [ ] `AddVideosModal` permet filtrar per tags i hashtags
- [ ] Comptador de filtres actius visible
- [ ] Netejar filtres reinicialitza tots els camps
- [ ] URL params persisteixen filtres a `/contingut`

**Dependències:**
- ✅ M3a completat (tags, hashtags, filtres bàsics)
- ✅ M4 completat (AddVideosModal)

**Risc:** 🟢 Baix (funcionalitat UI sense canvis de schema)

---

### **M6c: Gestió d'Usuaris del Centre** 🟢

**Objectiu:** Permetre que Editor-profe gestioni els usuaris (editor_profe, editor_alumne, display) del seu centre des de la pestanya `/usuaris`.

**Durada:** 1 setmana

**Entregables:**

**1. Pàgina `/usuaris`**
- Visible només per `editor_profe` i `admin_global`
- Llistat d'usuaris del centre actual (taula)
- Columnes: Nom, Email, Rol, Estat (actiu/inactiu), Data creació
- Cerca per nom o email
- Filtre per rol (editor_profe, editor_alumne, display)
- Filtre per estat (actiu/inactiu)

**2. Crear usuari del centre**
- Formulari modal amb:
  - Email (obligatori)
  - Nom complet (obligatori)
  - Rol: editor_profe, editor_alumne, display
  - `center_id` assignat automàticament al centre del professor
- Invitació per email automàtica (reutilitzar sistema M2)
- Validació: email únic al sistema

**3. Editar usuari del centre**
- Modal d'edició amb:
  - Nom complet
  - Rol (canviable dins dels 3 rols permesos)
  - Estat actiu/inactiu
- Restricció: No pot canviar el seu propi rol
- Restricció: No pot desactivar-se a ell mateix

**4. Reenviar invitació**
- Botó "Reenviar invitació" per usuaris pendents d'onboarding
- Cooldown entre reenviaments (reutilitzar lògica M2)

**5. Restriccions de seguretat**
- Editor-profe NOMÉS veu i gestiona usuaris del seu centre
- No pot deixar el centre sense cap editor_profe actiu (validació server-side)
- No pot crear admin_global (només admin_global pot fer-ho)
- Editor-profe pot crear altres editor_profe per al seu centre
- API routes validen permisos server-side

**6. API Routes**
- `GET /api/center/users` — Llistat d'usuaris del centre
- `POST /api/center/users` — Crear usuari al centre
- `PATCH /api/center/users/[id]` — Editar usuari del centre
- `POST /api/center/users/[id]/resend-invite` — Reenviar invitació

**7. Components**
- `CenterUserList` — Taula d'usuaris del centre
- `CenterUserFormModal` — Modal crear/editar usuari
- Hook: `useCenterUsers` — Gestió d'estat

**Criteris d'Acceptació:**
- [ ] Editor-profe veu `/usuaris` al sidebar
- [ ] Pot crear usuaris editor_profe, editor_alumne i display del seu centre
- [ ] Pot editar nom, rol i estat dels usuaris del centre
- [ ] Pot reenviar invitació a usuaris pendents
- [ ] No pot deixar el centre sense cap editor_profe actiu
- [ ] No pot desactivar-se ni canviar-se el rol a ell mateix
- [ ] Admin_global també pot accedir a `/usuaris` (veu usuaris del centre seleccionat)
- [ ] Invitació per email s'envia correctament
- [ ] RLS policies impedeixen accés a usuaris d'altres centres

**Dependències:**
- ✅ M2 completat (sistema d'invitació, UserForm base)
- ✅ Taula `users` amb RLS (M1)

**Risc:** 🟢 Baix (reutilitza patrons existents de M2)

---

### **M7: Features Avançades** 🟡 EN PROGRÉS

**Objectiu:** Calendari de llistes i Llista Global a Landing Page.

**Durada:** 1.5 setmanes

**Entregables:**

**1. Calendari de Llistes (ScheduleOverride)** ✅ COMPLETAT
- Calendari integrat a l'editor de llistes `custom`
- Click en dia → assignar/desassignar llista
- Lògica: URL override → schedule_override → weekday playlist → Friday fallback

**2. Llista Global a Landing Page** 🎯 EN PROGRÉS
- **Decisió de disseny:** Landing Playlist i Llistes Globals s'unifiquen en una sola funcionalitat
- Una única llista global (`kind: 'global'`) es mostra a la landing page
- Reproductor 16:9 amb autoplay (muted) i loop infinit
- Botó "Ampliar" per obrir a pantalla completa en nova pestanya
- Només admin_global pot editar la llista global
- Només pot contenir vídeos amb `is_shared_with_other_centers = true`
- editor_profe pot copiar la llista global al seu centre
- Veure: `docs/milestones/M7-llista-global-landing.md`

**3. Millores UI** (opcional, baix prioritat)
- Sidebar col·lapsable (només icones en mode compacte)
- Animacions de transició amb framer-motion
- Breadcrumbs per navegació
- Dark mode

**Criteris d'Acceptació:**
- [x] Calendari permet assignar llistes per data
- [x] Llista del dia respecta assignacions del calendari
- [ ] Landing page mostra la llista global amb reproductor 16:9
- [ ] Autoplay + loop infinit
- [ ] Botó ampliar a pantalla completa
- [ ] Validació: només vídeos compartits a la llista global
- [ ] editor_profe pot copiar la llista global

**Dependències:**
- ✅ M4 completat (llistes)
- ✅ M6 completat (pantalla principal)
- ✅ Taula `schedule_overrides` amb RLS

**Risc:** 🟢 Baix

---

### **🔒 Revisió de Seguretat Completa** ✅ COMPLETAT

**Objectiu:** Auditoria exhaustiva de seguretat del projecte en 5 fases.

**Durada:** 1 dia (6 febrer 2026)

**Fases Completades:**

#### **Fase 1: Database & RLS** ✅
- Auditoria de 20 taules amb RLS habilitat
- **Vulnerabilitat crítica corregida:** Polítiques `users` permetien INSERT/DELETE a qualsevol usuari autenticat
- Migració aplicada: `20260206200000_fix_users_rls_security.sql`

#### **Fase 2: Autenticació i Autorització** ✅
- Verificat patró de doble verificació (BD > metadata)
- Tots els endpoints comproven rol des de taula `users`
- Service role usat correctament per operacions admin
- Investigat: Invitacions Supabase caduquen en 24h (tots els plans)

#### **Fase 3: Gestió de Secrets** ✅
- Creat `.env.example` complet amb totes les variables
- Eliminat project-ref de documentació (`resumen_actual.md`, `CONFIGURACIO_SUPABASE_URLS.md`)
- Renombrat SVG per eliminar identificadors sensibles
- Actualitzat `.gitignore` per permetre `.env.example`

#### **Fase 4: Integració Vimeo** ✅
- Afegida autenticació a `/api/vimeo/status/[videoId]`
- Verificat que token només s'usa server-side
- Validació de mida i format de fitxers correcta

#### **Fase 5: OWASP (XSS, CSRF, Open Redirect)** ✅
- **Open Redirect corregit** a `/auth/callback` (validació paràmetre `next`)
- **Security Headers afegits** a `next.config.ts`:
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Verificat: Cap ús de `dangerouslySetInnerHTML` ni `eval()`
- Verificat: Supabase usa queries parametritzades (no SQL injection)

**Commits de Seguretat:**
- `09aa7c8` - security: fix critical RLS vulnerabilities in users table
- `e6e43ef` - security: comprehensive security audit fixes (Phases 3-5)

**Fitxers Modificats:**
- `supabase/migrations/20260206200000_fix_users_rls_security.sql`
- `app/api/vimeo/status/[videoId]/route.ts`
- `app/auth/callback/route.ts`
- `next.config.ts`
- `.env.example`
- `.gitignore`
- Documentació netejada de project-refs

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

**3. ~~Usuaris del Centre (Editor-profe)~~** → Mogut a **M6c**

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
- [ ] ~~Editor-profe pot gestionar usuaris del centre~~ → M6c
- [ ] Històric d'auditoria accessible

**Dependències:**
- ✅ M3a completat (contingut)
- ✅ M6 completat (pantalla)
- ✅ Taula `guest_access_links` (M1)

**Risc:** 🟢 Baix

---

## 📅 Timeline Real (Actualitzat 2 Febrer 2026)

### **Estat Actual del Projecte**

| Milestone | Durada | Setmanes Acumulades | Estat | Notes |
|-----------|--------|---------------------|-------|-------|
| M0: Setup ✅ | - | 0 | ✅ COMPLETAT | Desembre 2025 |
| M1: Foundation ✅ | 1.5 setmanes | 1.5 | ✅ COMPLETAT | Desembre 2025 - Gener 2026 |
| M2: Admin UI ✅ | 1 setmana | 2.5 | ✅ COMPLETAT | Gener 2026 |
| M2.5: Auth Context ✅ | 0.5 setmanes | 3 | ✅ COMPLETAT | Gener 2026 |
| M3a: Contingut Base ✅ | 1 setmana | 4 | ✅ COMPLETAT | 7-12 Gener 2026 |
| M3b: Direct Upload ✅ | 1 setmana | 5 | ✅ COMPLETAT | 12 Gener 2026 - NOVA |
| M3c: Moderació ✅ | 0.5 setmanes | 5.5 | ✅ COMPLETAT | 12 Gener 2026 - Simplificada |
| M4: Llistes ✅ | 1.5 setmanes | 7 | ✅ COMPLETAT | 19 Gener 2026 |
| M5: RSS ✅ | 1.5 setmanes | 8.5 | ✅ COMPLETAT | Febrer 2026 |
| M6: Pantalla Principal ✅ | 2 setmanes | 10.5 | ✅ COMPLETAT | Febrer 2026 - 🎯 MVP DEMO |
| M6b: Filtre Avançat ✅ | 1 setmana | 11.5 | ✅ COMPLETAT | Febrer 2026 |
| M6c: Usuaris Centre ✅ | 1 setmana | 12.5 | ✅ COMPLETAT | Febrer 2026 |
| M7: Features Avançades ✅ | 1.5 setmanes | 14 | ✅ COMPLETAT | Febrer 2026 |
| 🔒 Revisió Seguretat ✅ | 0.5 setmanes | 14.5 | ✅ COMPLETAT | 6 Febrer 2026 |
| M8: Multi-tenant | 1.5 setmanes | **16** | 🔵 PENDENT | ← Últim milestone |

**Total estimat:** ~16 setmanes (~4 mesos)
**Completat fins ara:** 14.5 setmanes (90%)
**MVP Demo:** ✅ Completat (Febrer 2026)
**Revisió Seguretat:** ✅ Completada (6 Febrer 2026)
**Completat final estimat:** Setmana 16 (Març 2026)

**Notes:**
- M3 va durar 2.5 setmanes (en lloc de 2) degut a l'addició de M3b (Direct Upload)
- M6b i M6c afegits el 2 Febrer 2026 (filtratge avançat i gestió usuaris)
- Revisió de seguretat completa realitzada el 6 Febrer 2026 (5 fases)

---

### **Timeline Original (Planificat) - OBSOLET**

<details>
<summary>Veure timeline planificat original (click per expandir)</summary>

Aquest era el timeline inicial del projecte. S'ha substituït pel timeline real de dalt.

| Milestone | Durada | Setmanes Acumulades |
|-----------|--------|---------------------|
| M0: Setup ✅ | COMPLETAT | 0 |
| M1: Foundation | 1.5-2 setmanes | 2 |
| M2: Admin UI | 1 setmana | 3 |
| M3a: Contingut Base | 1 setmana | 4 |
| M3b: Moderació | 1 setmana | 5 |
| M4: Llistes | 1.5 setmanes | 6.5 |
| M5: RSS | 1.5 setmanes | 8 |
| M6: Pantalla Principal 🎯 | 2 setmanes | **10** ← MVP Demo |
| M7: Features Avançades | 2 setmanes | 12 |
| M8: Multi-tenant | 1.5 setmanes | **13.5** ← Completo |

**Total planificat:** ~13.5 setmanes
**Desviació real:** +0.5 setmanes (per M3b Direct Upload)

</details>

---

## 🎯 Hites Clau (Demo Milestones)

### **✅ Demo 1: Admin Funcional (M2)** - COMPLETAT
**Setmana 2.5** - Gener 2026
- ✅ Gestió de centres i usuaris
- ✅ Sistema d'invitació funcional
- ✅ Zones gestionables

### **✅ Demo 2: Sistema de Contingut (M3)** - COMPLETAT
**Setmana 5.5** - Gener 2026
- ✅ Alta de vídeos amb URL Vimeo (M3a)
- ✅ Upload directe amb Tus protocol (M3b)
- ✅ Flux de moderació simplificat (M3c)
- ✅ Validació en temps real
- ⏳ Notificacions in-app (pendent futur)

### **✅ Demo 3: Llistes & RSS (M4-M5)** - COMPLETAT
**Setmana 8.5** - Febrer 2026
- ✅ Playlists funcionals amb drag&drop
- ✅ Feeds RSS mostrant-se amb rotació
- ✅ Configuració de timings RSS per centre

### **✅ Demo 4: MVP Complet (M6)** - COMPLETAT
**Setmana 10.5** - Febrer 2026 ← **MILESTONE CRÍTIC ASSOLIT**
- ✅ Pantalla principal amb 3 zones funcionant
- ✅ Mode Display en TV real
- ✅ Producte demo-able a stakeholders
- ✅ Loop de vídeo únic + fallback autoplay amb mute

### **✅ Demo 5: UX Complet (M6b-M6c)** - COMPLETAT
**Setmana 12.5** - Febrer 2026
- ✅ Filtres avançats per tags i hashtags (drawer lateral)
- ✅ Gestió d'usuaris del centre per Editor-profe
- ✅ Calendari de llistes (schedule overrides)
- ✅ Llista global a landing page

### **✅ Demo 5.5: Seguretat (Auditoria)** - COMPLETAT
**Setmana 14.5** - 6 Febrer 2026
- ✅ Auditoria RLS completa
- ✅ Correcció vulnerabilitats crítiques
- ✅ Security headers implementats
- ✅ Documentació de secrets actualitzada

### **🚀 Demo 6: Producte Complet (M8)** - PENDENT
**Setmana 16** - Març 2026 (estimat)
- Convidats temporals
- Auditoria i logs
- Llest per producció

---

## ⚠️ Riscos i Mitigacions (Actualitzat)

| Risc | Probabilitat | Impacte | Estat | Mitigació |
|------|--------------|---------|-------|-----------|
| ~~M1 s'allarga~~ | - | - | ✅ MITIGAT | M1 completat amb èxit |
| **Vimeo API canvia** | 🟡 Mitjana | 🟡 Mitjà | 🔄 ACTIU | Abstraure en lib separada + tests |
| **Upload grans fitxers lent** | 🟡 Mitjana | 🟢 Baix | 🔄 ACTIU | Tus protocol + retry + cancel·lació |
| ~~RSS feeds malformats~~ | - | - | ✅ MITIGAT | Parser robust + gestió d'errors implementats (M5) |
| **Supabase Realtime lent** | 🟢 Baixa | 🟡 Mitjà | ⏳ PENDENT | Polling fallback + caché (futur) |
| ~~Sincronització 3 zones M6~~ | - | - | ✅ MITIGAT | Zones independents funcionant correctament |
| ~~RLS policies incorrectes~~ | - | - | ✅ MITIGAT | Policies testejades i auditades (DB-AUDIT-REPORT.md) |
| ~~Mode Display inestable~~ | - | - | ✅ MITIGAT | Autoplay fallback + loop single video + error recovery |
| ~~Open Redirect~~ | - | - | ✅ MITIGAT | Validació paràmetre `next` a auth callback |
| ~~Security Headers~~ | - | - | ✅ MITIGAT | Headers afegits a next.config.ts (6 Feb 2026) |
| ~~Secrets exposats~~ | - | - | ✅ MITIGAT | Project-refs eliminats, .env.example documentat |

---

## 📊 Mètriques de Progrés

### **Criteris d'Èxit per Milestone**

**M3 (Sistema de Contingut):** ✅ COMPLETAT
- [x] Editor-profe pot crear vídeos amb URL Vimeo
- [x] Editor-profe pot pujar vídeos directament (upload Tus)
- [x] Validació Vimeo en temps real funciona
- [x] Sistema de tags i hashtags operatiu
- [x] Editor-alumne pot pujar vídeos (queden pendents)
- [x] Editor-profe pot aprovar/rebutjar vídeos
- [x] RLS policies correctes per cada rol
- [x] Filtres i cerca funcionals
- [ ] UI de notificacions in-app (pendent futur)

**M6 (MVP):** ✅ COMPLETAT
- [x] Usuari Display pot veure pantalla en TV 24/7
- [x] Vídeos es reprodueixen automàticament
- [x] Anuncis roten en bucle
- [x] RSS mostra notícies actualitzades
- [x] Editor-profe pot gestionar tot el contingut
- [x] Sistema de moderació funcional

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

## 📝 Pròxims Passos Immediats

### **Milestone M8: Multi-tenant Avançat** 🎯 SEGÜENT

**Objectiu:** Convidats temporals, compartició intercentres i auditoria.

**Tasques pendents:**
1. Sistema de convidats temporals (`guest_access_links`)
2. Compartició intercentres millorada
3. Pàgina d'auditoria amb logs d'accions
4. Exportació CSV de logs

### **Manteniment Continu**

**Tasques recurrents:**
- Monitorització d'errors en producció
- Validació de RLS amb nous rols/funcionalitats
- Actualització de dependències de seguretat
- Revisió periòdica de logs d'accés

---

**Data d'actualització:** 6 febrer 2026
**Estat:** Revisió de seguretat completada - M6b i M6c completats
**Progrés:** 78% del projecte total (12.5 de 16 setmanes)
