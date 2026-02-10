# Revisió de disseny UI — Icones Lucide

**Data:** 2026-02-10
**Estat:** Pendent d'aprovació del client

---

## Fase 1: Sidebar, Admin Tabs, Header

### 1. Sidebar (`app/components/layout/AppSidebar.tsx`)
- **Emojis → icones Lucide**: `📺→Monitor`, `📹→Video`, `📋→ListVideo`, `📡→Rss`, `👥→Users`, `⚙️→Settings`, `👤→User`
- **Tooltips al hover**: apareix el nom de la secció a la dreta de la icona (pur Tailwind, sense dependències)
- **Colors de les icones**: fosc per defecte (`--color-dark`), magenta (`--color-accent`) quan actiu o al hover
- **Fons groc corporatiu mantingut** (gradient `#FEDD2C → #FFF7CF`)
- Estils d'actiu i hover sense canvis (bg-white/80, shadow, barra magenta)

### 2. Tabs d'administració (`app/components/ui/AdminTabs.tsx` + `app/admin/page.tsx`)
- **Emojis → icones Lucide**: `🏫→School`, `👥→Users`, `🗺️→MapPin`, `🎬→Film`, `📊→BarChart3`
- Icones renderitzades com a components React (`w-4 h-4`) al costat del text

### 3. Header (`app/components/layout/AppHeader.tsx`)
- **Cerca**: emoji `🔍` → icona `Search` (w-4 h-4)
- **Banner d'error**: emoji `⚠️` → icona `AlertTriangle` (w-4 h-4, vermell)
- **Botó "Sortir"**: canviat de botó turquesa ple a estil ghost discret amb icona `LogOut`

---

## Fase 2: Resta de components

### 4. Taules Admin

#### `app/admin/tabs/ZonesTab.tsx`
- `🔍` → `<Search />`
- `✅ Activa` / `🔴 Inactiva` → `<CheckCircle />` / `<XCircle />`
- `✏️` → `<Pencil />`
- `🔴`/`✅` toggle → `<Power />` (color canvia segons estat)
- `🗑️` → `<Trash2 />`

#### `app/admin/tabs/CentresTab.tsx`
- `✏️` → `<Pencil />`
- `🔴`/`⚪` toggle → `<Power />` (color canvia segons estat)

#### `app/admin/tabs/UsersTab.tsx`
- `📧` → `<Mail />`
- `✏️` → `<Pencil />`
- `🔴`/`⚪` toggle → `<Power />`
- `🔴 Desactivat` → `<XCircle /> Desactivat`
- `⏳ Convidat` → `<Clock /> Convidat`
- `ℹ️` → `<Info />`

### 5. Components de Vídeo

#### `app/components/videos/VideoCard.tsx`
- `📹` thumbnail placeholder → `<Video />`
- `⏳ Pendent` badge → `<Clock /> Pendent`
- `🎬 Anunci` / `📹 Contingut` → `<Megaphone />` / `<Video />`
- `🌐 Compartit` → `<Globe /> Compartit`
- `▶️ Veure` → `<Play /> Veure`
- `✏️` → `<Pencil />`
- `🗑️` / `✕` → `<Trash2 />` / `<X />`

#### `app/components/videos/VideoGrid.tsx`
- `📹` empty state → `<Video />` (w-16 h-16)

#### `app/components/videos/VideoPreviewModal.tsx`
- `⏳ Pendent` → `<Clock /> Pendent d'aprovació`
- `⏱️` durada → `<Clock />`
- `🎬`/`📹` tipus → `<Megaphone />` / `<Video />`
- `📍` centre → `<MapPin />`

#### `app/components/videos/VimeoUrlInput.tsx`
- `❌` error → `<XCircle />`
- `✅` valid → `<CheckCircle />`

### 6. Components de Playlists

#### `app/components/playlists/PlaylistCard.tsx`
- `kindIcons` canviat de `Record<string, string>` (emojis) a `Record<string, LucideIcon>`:
  - `📅→Calendar`, `📢→Megaphone`, `📋→LayoutList`, `🌍→Globe`, `🏠→Home`
- Inline SVG trash → `<Trash2 />`

#### `app/components/playlists/PlaylistList.tsx`
- Section headers: `📅→Calendar`, `📢→Megaphone`, `📋→LayoutList`, `🌍→Globe`
- Empty states: `📋→LayoutList`, `🌍→Globe`

#### `app/components/playlists/DraggableVideoItem.tsx`
- Inline SVG drag handle (6 dots) → `<GripVertical />`
- `📹` thumbnail placeholder → `<Video />`
- Inline SVG remove (X) → `<X />`

#### `app/components/playlists/AddVideosModal.tsx`
- Inline SVG search → `<Search />`
- Inline SVG filter → `<Filter />`
- Inline SVG clear → `<X />`
- `📹` empty state → `<Video />`
- `📹` thumbnail placeholder → `<Video />`

### 7. Components RSS

#### `app/components/rss/RSSFeedCard.tsx`
- `⚠️`/`📰` → `<AlertTriangle />` / `<Newspaper />`
- 4 inline SVGs → `<RefreshCw />`, `<RotateCw />`, `<Pencil />`, `<Trash2 />`

#### `app/components/rss/DraggableRSSFeedItem.tsx`
- `⚠️`/`📰` → `<AlertTriangle />` / `<Newspaper />`
- Inline SVG drag handle → `<GripVertical />`
- Inline SVG remove → `<X />`

#### `app/components/rss/RSSRotationOrder.tsx`
- `🔄` empty state → `<RefreshCw />`
- `⚠️`/`📰` → `<AlertTriangle />` / `<Newspaper />`

#### `app/components/rss/RSSConfigForm.tsx`
- `⚠️` warning → `<AlertTriangle />`

### 8. Pàgines d'Auth i Display

#### `app/components/auth/SessionConflictModal.tsx`
- `⚠️` → `<AlertTriangle />`
- `ℹ️` → `<Info />`

#### `app/auth/auth-code-error/page.tsx`
- `⚠️` → `<AlertTriangle />`

#### `app/auth/confirm/page.tsx`
- `❌` → `<XCircle />`
- `🎉` → `<PartyPopper />`

#### `app/components/landing/LandingVideoPlayer.tsx`
- `📺` → `<Monitor />`

#### `app/pantalla/landing/page.tsx`
- `📺` → `<Monitor />`

#### `app/rss/page.tsx`
- `🔒` → `<Lock />`

---

## NO s'han tocat

- Emojis dins `console.log/warn` (no visibles per l'usuari)
- Emojis dins `alert()` (`VideoFormModal.tsx`)
- Caràcters Unicode simples: `✓`, `○` (ja estan bé estilísticament als badges actiu/inactiu)

---

## Notes tècniques

- **Llibreria**: `lucide-react` (^0.562.0), ja instal·lada al projecte
- **Mida estàndard**: `w-5 h-5` per sidebar/headers, `w-4 h-4` per inline/accions, `w-3/w-3.5 h-3/h-3.5` per badges
- **No s'han afegit dependències noves**
- **Type-check**: `npx tsc --noEmit` passa sense errors
- **Fitxers modificats (Fase 2)**: 21 fitxers
- **Revertir tot**: `git checkout -- .` (no hi ha cap commit)
