# Milestone 2: Admin Global UI

**Objectiu:** Crear la interfície d'administració global per gestionar centres, usuaris, zones i la LandingPlaylist. Aquesta interfície només és accessible per usuaris amb rol `admin_global`.

**Durada estimada:** 2-3 setmanes  
**Dependències:** M0 (Auth), M1 (DB Foundation)

---

## 1. Visió General

L'Admin Global UI permet als administradors del sistema:
- ✅ Gestionar centres educatius (CRUD)
- ✅ Gestionar usuaris de tot el sistema (crear, editar, assignar rols)
- ✅ Gestionar el catàleg de zones
- ✅ Configurar la LandingPlaylist pública
- ✅ Supervisar l'estat del sistema

**Principis de disseny:**
- Interfície clean i funcional
- Colors de marca (groc `#FEDD2C`, magenta `#F91248`, turquesa `#16AFAA`)
- Tipografia: Montserrat (títols) + Inter (contingut)
- Responsive design (desktop-first)

---

## Estat d'implementació (07/01/2026)

- Fet: middleware amb check de rol `admin_global` i redirecció, pàgina `/admin` amb tabs Centres/Usuaris/Zones funcionals (CRUD bàsic), API `/api/admin/*` amb validació de rol, zones inactives filtrades al selector de centres.
- Pendent: tabs LandingPlaylist i Supervisió (només placeholder), components reutilitzables (`DataTable`, `ActionButton`, `DraggableList`) no creats, paginació i uploads de logo no implementats, endpoint de reenviament d'invitació inexistent mentre el client el crida (`/api/admin/users/:id/resend-invite`).
- Seguretat: la protecció actual combina middleware + checks a API. El middleware utilitza `SUPABASE_SERVICE_ROLE_KEY` (sobreprivilegiat); recomanat canviar a `createMiddlewareClient` amb ANON key. Sidebar mostra Administració per rol hardcodejat; caldrà llegir el rol real d'usuari per ocultar l'entrada (evita confusió encara que el middleware bloquegi l'accés).

## 2. Layout Base Comú (`AdminLayout`)

### 2.1 Estructura Visual

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER (60px fix, z-index: 50)                             │
│  Logo | Cerca global | 🔔 Notificacions | 👤 User dropdown  │
│  Background: #FFFFFF | Border-bottom: #E5E7EB                │
└──────────────────────────────────────────────────────────────┘
┌────────┬─────────────────────────────────────────────────────┐
│        │                                                      │
│  SIDE  │  MAIN CONTENT                                       │
│  BAR   │  Background: #F9FAFB                                │
│        │  Padding: 32px                                      │
│  70px  │  Max-width: 1400px                                  │
│  fix   │  Margin: 0 auto                                     │
│        │                                                      │
│  🏠    │  [Contingut dinàmic per secció]                     │
│  📹    │                                                      │
│  📋    │                                                      │
│  📡    │                                                      │
│  ⚙️   │  ← Actiu (Admin)                                    │
│        │                                                      │
│  👤    │                                                      │
└────────┴─────────────────────────────────────────────────────┘
```

### 2.2 Components del Layout

**Header (`<AppHeader>`)**
- Logo PUBLICAT (clickable → dashboard)
- SearchBar global (amb Cmd+K)
- NotificationBell (badge amb contador)
- UserMenu dropdown (perfil, configuració, logout)
- Font: Montserrat Medium 16px
- Background: blanc amb ombra suau

**Sidebar (`<AppSidebar>`)**
- Width: 70px (només icones)
- Background: #FFFFFF
- Border-right: 1px #E5E7EB
- Icones: 24x24px, color #4B5563
- Estat actiu:
  - Background: #FEDD2C (groc marca)
  - Border-left: 4px #F91248 (magenta)
  - Icona: #111827
- Hover:
  - Background: #16AFAA10 (turquesa 10% opacity)
  - Transition: 200ms ease

**Icones del Sidebar:**
1. 🏠 Dashboard (`/dashboard`)
2. 📹 Contingut (`/contingut`) - només editors
3. 📋 Llistes (`/llistes`) - només editors
4. 📡 RSS (`/rss`) - només editor_profe
5. ⚙️ Administració (`/admin`) - **només admin_global**
6. 👤 Perfil (`/perfil`) - a baix

---

## 3. Pàgina d'Administració (`/admin`)

### 3.1 Estructura de la Pàgina

```tsx
<AdminLayout>
  <div className="admin-page">
    {/* Breadcrumb */}
    <Breadcrumb items={['Home', 'Administració']} />
    
    {/* Capçalera */}
    <PageHeader 
      title="Administració"
      description="Gestió global de centres, usuaris i zones del sistema"
    />
    
    {/* Tabs */}
    <AdminTabs 
      tabs={[
        { id: 'centres', label: 'Centres', icon: '🏫' },
        { id: 'usuaris', label: 'Usuaris', icon: '👥' },
        { id: 'zones', label: 'Zones', icon: '🗺️' },
        { id: 'landing', label: 'LandingPlaylist', icon: '🎬' },
        { id: 'supervisio', label: 'Supervisió', icon: '📊' }
      ]}
      activeTab={activeTab}
      onChange={setActiveTab}
    />
    
    {/* Contingut dinàmic per tab */}
    <TabContent activeTab={activeTab} />
  </div>
</AdminLayout>
```

### 3.2 Disseny dels Tabs

**Estil visual:**
```css
.admin-tabs {
  border-bottom: 1px solid #E5E7EB;
  margin-bottom: 32px;
}

.tab-button {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: 16px;
  color: #4B5563;
  padding: 12px 24px;
  border-bottom: 3px solid transparent;
  transition: all 200ms;
}

.tab-button:hover {
  color: #16AFAA; /* Turquesa */
}

.tab-button.active {
  color: #111827;
  border-bottom-color: #F91248; /* Magenta */
}
```

---

## 4. Tab 1: Centres

### 4.1 Vista de Llistat

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ 🔍 [Cerca centres...]              [+ Afegir Centre]      │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌──────────────┬────────────┬─────────┬──────────────────┐│
│ │ Nom Centre   │ Zona       │ Usuaris │ Accions          ││
│ ├──────────────┼────────────┼─────────┼──────────────────┤│
│ │ Institut XY  │ Bages      │ 12      │ ✏️ Editar 🔴 Baixa││
│ │ Escola AB    │ Barcelona  │ 8       │ ✏️ Editar ✅ Actiu││
│ │ Col·legi CD  │ Terrassa   │ 5       │ ✏️ Editar ✅ Actiu││
│ └──────────────┴────────────┴─────────┴──────────────────┘│
│                                                             │
│ Mostrant 1-10 de 24 centres          [1] 2 3 >            │
└────────────────────────────────────────────────────────────┘
```

**Funcionalitats:**
- Cerca en temps real (nom del centre)
- Ordenació per columna (clickable headers)
- Paginació (10, 25, 50 per pàgina)
- Filtres: Zona, Estat (actiu/inactiu)

**Accions:**
- ✏️ **Editar** → Obre modal d'edició
- 🔴/✅ **Toggle Actiu/Inactiu** → Confirmació inline
- 📊 **Veure detalls** (opcional) → Estadístiques del centre

### 4.2 Modal Crear/Editar Centre

**Formulari:**
```
┌────────────────────────────────────────────┐
│  [X] Crear nou centre                      │
├────────────────────────────────────────────┤
│                                             │
│  Nom del centre *                          │
│  ┌────────────────────────────────────┐   │
│  │ Institut Exemple                    │   │
│  └────────────────────────────────────┘   │
│                                             │
│  Zona *                                    │
│  ┌────────────────────────────────────┐   │
│  │ Bages                        ▼     │   │
│  └────────────────────────────────────┘   │
│                                             │
│  Logo del centre (opcional)                │
│  ┌────────────────────────────────────┐   │
│  │ [📤 Pujar imatge]                  │   │
│  └────────────────────────────────────┘   │
│                                             │
│  ☐ Centre actiu                            │
│                                             │
│           [Cancel·lar]  [Desar]            │
└────────────────────────────────────────────┘
```

**Validacions:**
- Nom requerit (min 3 caràcters)
- Zona requerida (selector de catàleg)
- Logo: max 2MB, formats jpg/png/webp

**Backend:**
```typescript
// API: POST /api/admin/centers
// Body: { name, zone_id, logo_url?, is_active }
```

---

## 5. Tab 2: Usuaris

### 5.1 Vista de Llistat

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ 🔍 [Cerca usuaris...]              [+ Convidar Usuari]    │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌───────────┬──────────┬──────────┬────────┬─────────────┐│
│ │ Email     │ Nom      │ Rol      │ Centre │ Estat       ││
│ ├───────────┼──────────┼──────────┼────────┼─────────────┤│
│ │ jo@xy.cat │ Joan P.  │ editor_p │ Inst X │ ✅ Actiu    ││
│ │           │          │          │        │ 📧 Pendent  ││
│ │ ma@ab.es  │ Maria G. │ admin_g  │ -      │ ✅ Actiu    ││
│ └───────────┴──────────┴──────────┴────────┴─────────────┘│
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Columnes addicionals:**
- **Estat d'invitació:**
  - 📧 Pendent d'activació (groc)
  - ✅ Alta completada (verd)
- **Accions:**
  - ✏️ Editar
  - 🔄 Reenviar invitació (només si pendent)
  - 🔴 Desactivar

### 5.2 Modal Convidar Usuari

**Formulari:**
```
┌────────────────────────────────────────────┐
│  [X] Convidar nou usuari                   │
├────────────────────────────────────────────┤
│                                             │
│  Email *                                   │
│  ┌────────────────────────────────────┐   │
│  │ usuari@example.cat                 │   │
│  └────────────────────────────────────┘   │
│                                             │
│  Nom complet                               │
│  ┌────────────────────────────────────┐   │
│  │ Joan Pérez                          │   │
│  └────────────────────────────────────┘   │
│                                             │
│  Rol *                                     │
│  ⚪ Admin Global                           │
│  ⚪ Editor Professor                       │
│  ⚪ Editor Alumne                          │
│  ⚪ Display                                │
│                                             │
│  Centre (si no és admin global) *          │
│  ┌────────────────────────────────────┐   │
│  │ Institut XY                  ▼     │   │
│  └────────────────────────────────────┘   │
│                                             │
│  ℹ️  S'enviarà una invitació per email    │
│                                             │
│           [Cancel·lar]  [Convidar]         │
└────────────────────────────────────────────┘
```

**Backend:**
```typescript
// API: POST /api/admin/users/invite
// Body: { email, full_name?, role, center_id? }
// Trigger: Supabase Auth invite + email template
```

---

## 6. Tab 3: Zones

### 6.1 Vista de Llistat

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ 🔍 [Cerca zones...]                 [+ Afegir Zona]       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌──────────────┬──────────┬────────┬────────────────────┐ │
│ │ Nom Zona     │ Centres  │ Estat  │ Accions            │ │
│ ├──────────────┼──────────┼────────┼────────────────────┤ │
│ │ Bages        │ 8        │ ✅ Act │ ✏️ Editar 🔴 Baixa │ │
│ │ Barcelona    │ 12       │ ✅ Act │ ✏️ Editar 🔴 Baixa │ │
│ │ Terrassa     │ 5        │ 🔴 Ina │ ✏️ Editar ✅ Activ │ │
│ └──────────────┴──────────┴────────┴────────────────────┘ │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Notes:**
- Les zones inactives no apareixen als selectors de creació de centres
- No es poden eliminar zones amb centres assignats

### 6.2 Modal Crear/Editar Zona

**Formulari simple:**
```
┌────────────────────────────────────────────┐
│  [X] Afegir nova zona                      │
├────────────────────────────────────────────┤
│                                             │
│  Nom de la zona *                          │
│  ┌────────────────────────────────────┐   │
│  │ Moianès                             │   │
│  └────────────────────────────────────┘   │
│                                             │
│  ☑ Zona activa                             │
│                                             │
│           [Cancel·lar]  [Desar]            │
└────────────────────────────────────────────┘
```

---

## 7. Tab 4: LandingPlaylist

### 7.1 Vista de Gestió

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ 🔍 [Cerca vídeos compartits...]    [+ Afegir Element]     │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ LLISTA ORDENABLE (drag & drop)                             │
│                                                             │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ ⋮⋮ [📷 Thumb]  Vídeo Nadal 2025           🗑️ ↑ ↓   │  │
│ │    Institut XY · 2:34 · Compartit                   │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ ⋮⋮ [📷 Thumb]  Anunci Important            🗑️ ↑ ↓   │  │
│ │    Anunci · 0:15                                     │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ ⋮⋮ [📷 Thumb]  Presentació Projecte        🗑️ ↑ ↓   │  │
│ │    Escola AB · 3:12 · Compartit                      │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Característiques:**
- Només vídeos amb `is_shared_with_other_centers = true`
- Drag handle (⋮⋮) per reordenar
- Thumbnails 120x90px amb border-radius 8px
- Animació suau en reordenar
- Confirmació abans d'eliminar

**Estil Targeta:**
```css
.landing-item {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  transition: all 200ms;
}

.landing-item:hover {
  border-color: #F91248; /* Magenta */
  box-shadow: 0 4px 12px rgba(249, 18, 72, 0.1);
}

.drag-handle {
  color: #16AFAA; /* Turquesa */
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}
```

### 7.2 Modal Afegir Element

**Selector de tipus:**
```
┌────────────────────────────────────────────┐
│  [X] Afegir a LandingPlaylist              │
├────────────────────────────────────────────┤
│                                             │
│  Tipus d'element:                          │
│  ⚪ Vídeo compartit                        │
│  ⚪ Anunci                                 │
│                                             │
│  [Si Vídeo] Cercador de vídeos compartits │
│  ┌────────────────────────────────────┐   │
│  │ 🔍 Cerca per títol...              │   │
│  └────────────────────────────────────┘   │
│                                             │
│  Resultats:                                │
│  ☐ Vídeo Nadal 2025 (Institut XY)         │
│  ☐ Presentació (Escola AB)                │
│                                             │
│           [Cancel·lar]  [Afegir]           │
└────────────────────────────────────────────┘
```

---

## 8. Tab 5: Supervisió

### 8.1 Dashboard de Mètriques

**Layout amb cards:**
```
┌────────────────────────────────────────────────────────────┐
│                                                             │
│ GRID 4 COLUMNES (responsive: 2 cols en tablet, 1 en móvil)│
│                                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│ │ 🏫       │ │ 👥       │ │ 📹       │ │ 📡       │      │
│ │          │ │          │ │          │ │          │      │
│ │   24     │ │   156    │ │   1,234  │ │    8     │      │
│ │ Centres  │ │ Usuaris  │ │ Vídeos   │ │ Feeds    │      │
│ │ Actius   │ │ Totals   │ │ Actius   │ │ RSS      │      │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│ │ ⚠️       │ │ 🎬       │ │ 📊       │ │ 🔔       │      │
│ │          │ │          │ │          │ │          │      │
│ │    2     │ │   15     │ │   89%    │ │    3     │      │
│ │ Errors   │ │ Landing  │ │ Aprovat  │ │ Pendent  │      │
│ │ RSS      │ │ Items    │ │          │ │ Revisar  │      │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Estil StatCard:**
```css
.stat-card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  transition: all 200ms;
}

.stat-card:hover {
  border-color: #16AFAA;
  box-shadow: 0 4px 12px rgba(22, 175, 170, 0.1);
}

.stat-number {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: 48px;
  color: #111827;
}

.stat-label {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: #4B5563;
  margin-top: 8px;
}

.stat-icon {
  font-size: 32px;
  margin-bottom: 12px;
}
```

---

## 9. Components Reutilitzables

### 9.1 Components de Layout

**`<AdminLayout>`**
```tsx
interface AdminLayoutProps {
  children: React.ReactNode;
}

// Wrapper amb header + sidebar + content
```

**`<PageHeader>`**
```tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode; // Botó opcional
}
```

**`<Breadcrumb>`**
```tsx
interface BreadcrumbProps {
  items: string[];
}
```

### 9.2 Components de Dades

**`<DataTable>`**
```tsx
interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: any) => void;
  loading?: boolean;
}
```

**`<AdminTabs>`**
```tsx
interface Tab {
  id: string;
  label: string;
  icon?: string;
}

interface AdminTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}
```

**`<DraggableList>`**
```tsx
interface DraggableListProps {
  items: any[];
  onReorder: (newOrder: any[]) => void;
  renderItem: (item: any) => React.ReactNode;
}
```

### 9.3 Components de Formulari

**`<SearchInput>`**
```tsx
interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
}
```

**`<Modal>`**
```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}
```

**`<ActionButton>`**
```tsx
interface ActionButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

// Primary: magenta #F91248, hover: turquesa #16AFAA
// Secondary: border turquesa, text turquesa
// Danger: vermell amb confirmació
```

### 9.4 Components de Visualització

**`<StatCard>`**
```tsx
interface StatCardProps {
  icon: string;
  value: number | string;
  label: string;
  onClick?: () => void;
}
```

**`<Badge>`**
```tsx
interface BadgeProps {
  variant: 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
}
```

---

## 10. API Routes

### 10.1 Centres

```typescript
// GET /api/admin/centers
// Query: ?search=string&zone=uuid&page=1&limit=10
// Response: { centers: Center[], total: number, page: number }

// POST /api/admin/centers
// Body: { name, zone_id, logo_url?, is_active }
// Response: { center: Center }

// PATCH /api/admin/centers/:id
// Body: { name?, zone_id?, logo_url?, is_active? }
// Response: { center: Center }

// DELETE /api/admin/centers/:id (soft delete)
// Response: { success: boolean }
```

### 10.2 Usuaris

```typescript
// GET /api/admin/users
// Query: ?search=string&role=user_role&center=uuid&page=1
// Response: { users: User[], total: number }

// POST /api/admin/users/invite
// Body: { email, full_name?, role, center_id? }
// Response: { user: User, invitation_sent: boolean }

// POST /api/admin/users/:id/resend-invitation
// Response: { invitation_sent: boolean }

// PATCH /api/admin/users/:id
// Body: { full_name?, role?, center_id?, is_active? }
// Response: { user: User }
```

### 10.3 Zones

```typescript
// GET /api/admin/zones
// Response: { zones: Zone[] }

// POST /api/admin/zones
// Body: { name, is_active }
// Response: { zone: Zone }

// PATCH /api/admin/zones/:id
// Body: { name?, is_active? }
// Response: { zone: Zone }
```

### 10.4 LandingPlaylist

```typescript
// GET /api/admin/landing-playlist
// Response: { items: PlaylistItem[] }

// POST /api/admin/landing-playlist/items
// Body: { video_id, type: 'content' | 'announcement' }
// Response: { item: PlaylistItem }

// PATCH /api/admin/landing-playlist/reorder
// Body: { item_ids: uuid[] }
// Response: { success: boolean }

// DELETE /api/admin/landing-playlist/items/:id
// Response: { success: boolean }
```

### 10.5 Supervisió

```typescript
// GET /api/admin/stats
// Response: {
//   centers: { total, active },
//   users: { total, by_role },
//   videos: { total, approved, pending },
//   rss_feeds: { total, active, with_errors }
// }
```

---

## 11. Configuració de Tailwind

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#FEDD2C',      // Groc PUBLICAT
        accent: '#F91248',       // Magenta
        secondary: '#16AFAA',    // Turquesa
        dark: '#111827',         // Text principal
        gray: {
          DEFAULT: '#4B5563',    // Text secundari
          light: '#F9FAFB',      // Fons pàgines
          border: '#E5E7EB',     // Línies
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Montserrat', 'system-ui', 'sans-serif'],
      }
    }
  }
}
```

---

## 12. Protecció de Rutes

### 12.1 Middleware de Next.js

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const supabase = createMiddlewareClient({ req: request });
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user && request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Verificar rol admin_global
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role !== 'admin_global') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
}
```

### 12.2 Hook personalitzat

```typescript
// hooks/useRequireAdmin.ts
export function useRequireAdmin() {
  const router = useRouter();
  const { user, profile } = useAuth();
  
  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else if (profile?.role !== 'admin_global') {
      router.push('/dashboard');
    }
  }, [user, profile]);
  
  return { isAdmin: profile?.role === 'admin_global' };
}
```

---

## 13. Priorització d'Implementació

### Fase 1: Foundation (Setmana 1)
1. [x] Configurar Tailwind amb colors de marca
2. [x] Crear `<AdminLayout>` (header + sidebar)
3. [x] Implementar middleware de protecció
4. [x] Crear components base (`<PageHeader>`, `<Breadcrumb>`, `<AdminTabs>`)
5. [x] Setup API routes base

### Fase 2: Gestió de Zones i Centres (Setmana 2)
6. [x] Tab Zones (CRUD complet)
7. [x] Tab Centres (llistat + cerca)
8. [x] Modal crear/editar Centre
9. [ ] Upload de logo (Supabase Storage)
10. [x] API routes `/api/admin/centers` i `/api/admin/zones`

### Fase 3: Gestió d'Usuaris (Setmana 2-3)
11. [x] Tab Usuaris (llistat + cerca)
12. [x] Modal convidar usuari (integració amb Supabase Auth)
13. [ ] Funcionalitat "Reenviar invitació" (endpoint no creat)
14. [x] Editar usuari (rol, centre, estat)
15. [x] API routes `/api/admin/users`

### Fase 4: LandingPlaylist (Setmana 3)
16. [ ] Component `<DraggableList>` (drag & drop)
17. [ ] Tab LandingPlaylist (llistat ordenable)
18. [ ] Modal afegir element (vídeos compartits)
19. [ ] API routes `/api/admin/landing-playlist`

### Fase 5: Supervisió (Setmana 3)
20. [ ] Component `<StatCard>`
21. [ ] Tab Supervisió (dashboard de mètriques)
22. [ ] API route `/api/admin/stats`

### Fase 6: Poliment (Opcional)
23. [ ] Animacions i transicions
24. [ ] Toast notifications (success/error)
25. [ ] Loading states (spinners/toasts coherents)
26. [ ] Responsive design (tablet/mobile revisat)

---

## 14. Criteris d'Acceptació

### 14.1 Funcionals
- [x] Només usuaris `admin_global` poden accedir a `/admin` (middleware + API)
- [x] Crear, editar i desactivar centres funciona correctament
- [x] Convidar usuaris envia email d'invitació
- [ ] Reenviar invitació només apareix si l'usuari està "Pendent d'activació" (UI mostra acció però falta endpoint)
- [x] Zones inactives no apareixen als selectors de centres
- [ ] LandingPlaylist només accepta vídeos amb `isSharedWithOtherCenters = true` (no implementat)
- [ ] Drag & drop reordena correctament la LandingPlaylist (no implementat)
- [ ] Supervisió mostra dades en temps real (no implementat)

### 14.2 UI/UX
- [x] Colors de marca aplicats consistentment
- [x] Tipografia Montserrat (títols) + Inter (contingut)
- [x] Hover states amb transicions suaus
- [ ] Loading amb spinners/toasts coherents (ara textos simples)
- [ ] Confirmacions abans d'accions destructives (només present a eliminar zona)
- [ ] Missatges d'error clars i accionables a tots els fluxos
- [ ] Layout responsive revisat per tablet/mobile

### 14.3 Tècnics
- [x] API routes protegides amb validació de rol
- [ ] Queries optimitzades (paginació, índexs) a llistats
- [ ] RLS policies validades per rols no admin_global (revisió pendent)
- [x] Formularis amb validació client i servidor bàsica
- [ ] Upload d'imatges amb límit de mida (logos de centre)
- [ ] Tests E2E per fluxos crítics

---

## 15. Checklist de Finalització

**Layout i Navegació**
- [x] `<AdminLayout>` amb header + sidebar funcional
- [ ] Sidebar mostra icona Administració només a admin_global (rol hardcodejat a `admin_global`)
- [x] Sidebar indica secció activa amb colors de marca
- [x] Middleware redirigeix usuaris no autoritzats

**Tab Centres**
- [ ] Llistat de centres amb cerca i paginació (paginació pendent)
- [ ] Crear centre amb zona i logo (logo pendent)
- [x] Editar centre (nom, zona, estat)
- [ ] Desactivar/activar centre amb confirmació

**Tab Usuaris**
- [x] Llistat d'usuaris amb cerca i filtre per rol
- [x] Convidar usuari envia invitació per email
- [ ] Reenviar invitació només si pendent (falta endpoint)
- [x] Editar usuari (rol, centre, estat)

**Tab Zones**
- [x] Llistat de zones amb cerca
- [x] Crear i editar zones
- [x] Activar/desactivar zones

**Tab LandingPlaylist**
- [ ] Llistat ordenable amb drag & drop
- [ ] Afegir vídeos compartits i anuncis
- [ ] Eliminar elements amb confirmació
- [ ] Validació de `isSharedWithOtherCenters`

**Tab Supervisió**
- [ ] Dashboard amb 8 cards de mètriques
- [ ] Dades actualitzades en temps real

**Components i Estil**
- [ ] `<DataTable>` reutilitzable
- [x] `<AdminTabs>` amb estil de marca
- [x] `<Modal>` per formularis
- [ ] `<ActionButton>` amb variants
- [x] Colors i tipografia segons guia d'estil

**Testing**
- [ ] Tests unitaris de components crítics
- [ ] Tests d'integració d'API routes
- [ ] Test E2E del flux de creació de centre

---

## 16. Pròxims Passos (Post-M2)

Un cop completat M2, el següent milestone serà:

**M3 - Centre Management UI**
- Dashboard del centre (visible per editors)
- Gestió de contingut del propi centre
- Gestió de hashtags locals
- Gestió d'usuaris del centre (només editor_profe)

---

## Notes Finals

Aquest milestone estableix la **interfície d'administració global** del sistema, permetent als administradors gestionar centres, usuaris i configuració global de forma eficient i visualment coherent amb la marca PUBLICAT.

**Durada estimada:** 2-3 setmanes  
**Prioritat:** Alta (bloqueador per a onboarding de centres)  
**Complexitat:** Mitjana-Alta (integració amb Auth, Storage, RLS)
