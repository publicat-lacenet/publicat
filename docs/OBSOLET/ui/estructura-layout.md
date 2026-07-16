# Estructura UI i Layout del Projecte

## 📋 Visió General

PUBLICAT utilitza un sistema de layouts modular basat en Next.js App Router que s'adapta segons el tipus d'usuari i la secció de l'aplicació.

---

## 🎨 Layouts Disponibles

### 1. **AdminLayout** (Principal)
**Ubicació:** [`app/components/layout/AdminLayout.tsx`](../../app/components/layout/AdminLayout.tsx)

**Estructura:**
```
┌─────────────────────────────────────────┐
│        AppHeader (60px fixed top)       │
│  Logo + Search + Notifications + User   │
├────┬────────────────────────────────────┤
│ A  │                                    │
│ p  │                                    │
│ p  │     Main Content Area              │
│ S  │     (ml-[70px] mt-[60px] p-8)      │
│ i  │     Max-width: 1400px              │
│ d  │                                    │
│ e  │                                    │
│ b  │                                    │
│ a  │                                    │
│ r  │                                    │
│    │                                    │
│ 70 │                                    │
│ px │                                    │
└────┴────────────────────────────────────┘
```

**Components:**
- **AppHeader:** Logo PUBLICAT, barra de cerca (placeholder), notificacions, avatar usuari
- **AppSidebar:** Navegació vertical amb gradient groc (#FEDD2C → #FFF7CF), icones amb tooltips
- **Main content:** Àrea central amb padding, màxim 1400px d'ample, centrat

**Usat per:**
- `/visor`
- `/contingut`
- `/llistes`
- `/rss`
- `/usuaris`
- `/admin`
- `/perfil`

---

### 2. **FullscreenLayout** (Futur M6)
**Pendent d'implementació**

**Estructura:**
```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│                                         │
│         Fullscreen Content              │
│         (sense header ni sidebar)       │
│                                         │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

**Usat per:**
- `/pantalla` (rol display)

---

### 3. **PublicLayout** (Existent)
**Només header simple**

**Usat per:**
- `/` (landing page)
- `/login`
- `/reset-password`
- `/auth/*`

---

## 🗺️ Mapa de Navegació

### Sidebar Principal (AdminLayout)

```
┌─────────────────┐
│  📺 Visor       │  → /visor (tots excepte display)
├─────────────────┤
│  📹 Contingut   │  → /contingut (editor_profe, editor_alumne, admin_global)
├─────────────────┤
│  📋 Llistes     │  → /llistes (editor_profe, editor_alumne, admin_global)
├─────────────────┤
│  📡 RSS         │  → /rss (editor_profe, admin_global)
├─────────────────┤
│  👥 Usuaris     │  → /usuaris (editor_profe, admin_global)
├─────────────────┤
│  ⚙️ Administr.  │  → /admin (admin_global)
├─────────────────┤
│                 │
│     (bottom)    │
├─────────────────┤
│  👤 Perfil      │  → /perfil (tots)
└─────────────────┘
```

### Permisos per Rol

| Secció | admin_global | editor_profe | editor_alumne | display |
|--------|--------------|--------------|---------------|---------|
| Visor | ✅ | ✅ | ✅ | ❌ (va a /pantalla) |
| Contingut | ✅ | ✅ | ✅ | ❌ |
| Llistes | ✅ | ✅ | ✅ | ❌ |
| RSS | ✅ | ✅ | ❌ | ❌ |
| Usuaris | ✅ | ✅ | ❌ | ❌ |
| Administració | ✅ | ❌ | ❌ | ❌ |
| Perfil | ✅ | ✅ | ✅ | ✅ |
| Pantalla | ✅ | ✅ | ✅ | ✅ |

---

## 📄 Pàgines Implementades

### ✅ Pàgines Funcionals

#### 1. **Landing Page** (`/`)
- **Layout:** PublicLayout
- **Estat:** ✅ Completa
- **Contingut:** Presentació projecte PUBLICAT amb seccions informatives

#### 2. **Login** (`/login`)
- **Layout:** PublicLayout
- **Estat:** ✅ Funcional
- **Redireccions:** 
  - Tots els rols → `/dashboard` → Redirigeix a `/visor` o `/pantalla`

#### 3. **Dashboard** (`/dashboard`)
- **Layout:** Sense layout (només router)
- **Estat:** ✅ Funcional
- **Lògica de redirecció:**
  ```typescript
  if (role === 'display') redirect('/pantalla');
  else redirect('/visor');
  ```

#### 4. **Administració** (`/admin`)
- **Layout:** AdminLayout
- **Estat:** ✅ Parcial (només tab Zones complet)
- **Tabs:**
  - 🏫 Centres (placeholder)
  - 👥 Usuaris (placeholder)
  - 🗺️ **Zones** ✅ (CRUD complet)
  - 🎬 LandingPlaylist (placeholder)
  - 📊 Supervisió (placeholder)

---

### 🚧 Pàgines Placeholder (Creades)

Totes aquestes pàgines tenen:
- ✅ AdminLayout aplicat
- ✅ Breadcrumb correcte
- ✅ PageHeader amb títol i descripció
- ✅ Missatge "S'implementarà al Milestone MX"
- ✅ Middleware protection

#### 5. **Visor** (`/visor`)
- **Milestone:** M6
- **Descripció:** Reproducció de llistes, anuncis i RSS
- **Icona:** 📺

#### 6. **Contingut** (`/contingut`)
- **Milestone:** M3
- **Descripció:** Gestió de vídeos (pujar, editar, moderar)
- **Icona:** 📹

#### 7. **Llistes** (`/llistes`)
- **Milestone:** M4
- **Descripció:** Creació i gestió de playlists
- **Icona:** 📋

#### 8. **RSS** (`/rss`)
- **Milestone:** M5
- **Descripció:** Gestió de fonts RSS externes
- **Icona:** 📡

#### 9. **Usuaris** (`/usuaris`)
- **Milestone:** M3
- **Descripció:** Administració d'usuaris del centre
- **Icona:** 👥

#### 10. **Perfil** (`/perfil`)
- **Milestone:** Futur
- **Descripció:** Dades personals i preferències
- **Icona:** 👤

---

### 🔒 Pàgines Especials

#### 11. **Pantalla** (`/pantalla`)
- **Layout:** Actualment AdminLayout (temporal)
- **Estat:** ✅ Placeholder
- **Futur:** FullscreenLayout sense header/sidebar (M6)
- **Rol:** Només `display`

---

## 🎯 Components UI Reutilitzables

### 1. **Breadcrumb**
**Ubicació:** [`app/components/ui/Breadcrumb.tsx`](../../app/components/ui/Breadcrumb.tsx)

**Ús:**
```tsx
<Breadcrumb items={['Administració', 'Zones']} />
```

**Estil:**
- Separador: `/`
- Últim element: bold
- Resta: clickeable (futur: amb links reals)

---

### 2. **PageHeader**
**Ubicació:** [`app/components/ui/PageHeader.tsx`](../../app/components/ui/PageHeader.tsx)

**Props:**
- `title`: string (obligatori)
- `description`: string (opcional)
- `action`: ReactNode (opcional - botó CTA)

**Ús:**
```tsx
<PageHeader
  title="Administració"
  description="Gestió global de centres, usuaris i zones"
  action={<Button>Afegir Zona</Button>}
/>
```

---

### 3. **AdminTabs**
**Ubicació:** [`app/components/ui/AdminTabs.tsx`](../../app/components/ui/AdminTabs.tsx)

**Props:**
- `tabs`: Array de {id, label, icon}
- `activeTab`: string
- `onTabChange`: function

**Estil:**
- Tab actiu: border-bottom magenta 2px
- Hover: bg-gray-50

---

### 4. **Button**
**Ubicació:** [`app/components/ui/Button.tsx`](../../app/components/ui/Button.tsx)

**Variants:**
- `primary`: Magenta (#F91248)
- `secondary`: Turquesa (#16AFAA)
- `danger`: Vermell destructiu
- `ghost`: Transparent amb hover

**Estats:**
- Loading amb spinner
- Disabled

---

### 5. **Modal**
**Ubicació:** [`app/components/ui/Modal.tsx`](../../app/components/ui/Modal.tsx)

**Característiques:**
- Backdrop amb blur
- Tanca amb Escape
- Scroll intern si contingut llarg
- Botó tancar (X)

---

## 🎨 Design System

### Paleta de Colors

```css
/* Brand Colors */
--color-primary: #FEDD2C    /* Groc marca */
--color-accent: #F91248     /* Magenta botons */
--color-secondary: #16AFAA  /* Turquesa hover */

/* Neutrals */
--color-dark: #111827       /* Text principal */
--color-gray: #4B5563       /* Text secundari */
--color-light-bg: #F9FAFB   /* Fons seccions */
--color-border: #E5E7EB     /* Línies/bordes */
```

### Tipografia

- **Headings:** Montserrat (variable: `--font-montserrat`)
- **Body:** Inter (variable: `--font-inter`)

### Pesos de Font

- **Regular:** 400
- **Medium:** 500
- **Semibold:** 600
- **Bold:** 700

---

## 🛣️ Roadmap d'Implementació

### ✅ M0 - Setup & Auth (Completat)
- Landing page
- Login/Register
- Reset password
- Auth flow

### ✅ M1 - Foundation DB (Completat)
- Migracions base de dades
- RLS policies
- Seed data

### 🚧 M2 - Admin Global UI (En Curs)
- ✅ Phase 1: Layout + Zones tab
- ⏳ Phase 2: Centres tab
- ⏳ Phase 3: Usuaris tab
- ⏳ Phase 4: LandingPlaylist tab
- ⏳ Phase 5: Supervisió tab

### ⏳ M3 - Contingut + Usuaris
- Pàgina Contingut amb gestió vídeos
- Integració Vimeo upload
- Sistema de moderació
- Pàgina Usuaris amb invitacions

### ⏳ M4 - Llistes
- Pàgina Llistes
- Crear/editar playlists
- Drag & drop vídeos
- Assignació a pantalles

### ⏳ M5 - RSS
- Pàgina RSS
- Afegir/editar feeds
- Parsejat contingut
- Freqüència actualització

### ⏳ M6 - Visor + Pantalla
- Implementar Visor complet
- FullscreenLayout per Display
- Autoplay amb transicions
- Integració RSS en temps real

---

## 🔄 Flux d'Autenticació

```
Login (/login)
    ↓
Dashboard (/dashboard)
    ↓
    ├─→ display → /pantalla (fullscreen futur)
    └─→ altres rols → /visor (pàgina principal)
```

---

## 📝 Notes d'Implementació

### Sidebar Dinàmic
**Estat actual:** Rol hardcoded com `'admin_global'`

**Futur (M3):** 
```typescript
const { user, profile } = useAuth(); // Context provider
const visibleItems = sidebarItems.filter(item => 
  !item.roles || item.roles.includes(profile.role)
);
```

### Breadcrumbs
**Estat actual:** Strings estàtics sense enllaços

**Futur (M3):**
```typescript
<Breadcrumb items={[
  { label: 'Administració', href: '/admin' },
  { label: 'Zones', href: '/admin?tab=zones' }
]} />
```

### Header Usuari
**Estat actual:** Hardcoded "Admin"

**Futur (M3):**
```typescript
<div>{profile.name || user.email}</div>
<img src={center.logo_url} alt="Logo centre" />
```

---

## 🧪 Testing de Navegació

Per verificar que tot funciona:

1. **Login com admin_global:**
   - ✅ Hauria de veure totes les seccions al sidebar
   - ✅ Després del login va a `/visor`

2. **Navegar per totes les seccions:**
   - ✅ Visor: placeholder M6
   - ✅ Contingut: placeholder M3
   - ✅ Llistes: placeholder M4
   - ✅ RSS: placeholder M5
   - ✅ Usuaris: placeholder M3
   - ✅ Administració: tabs visibles, només Zones funcional
   - ✅ Perfil: placeholder futur

3. **Middleware:**
   - ✅ Rutes protegides sense auth → redirect `/login`
   - ✅ Role display accedint `/visor` → redirect `/pantalla`

---

## 📚 Documentació Relacionada

- [M2 Admin UI](../OBSOLET/milestones/M2-admin-ui.md)
- [Guia d'Estil](guia-estil.md)
- [Roles](../roles.md)
- [Domain Model](../domain-model.md)

---

**Última actualització:** 24 desembre 2025  
**Estat:** UI Structure v1.0 - Placeholders completats ✅
