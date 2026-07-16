# Milestone 3a: Contingut Base

**Objectiu:** Sistema de gestió de vídeos per Editor-profe (sense moderació inicial). Permet crear, editar i visualitzar contingut audiovisual integrat amb Vimeo.

**Durada estimada:** 1 setmana  
**Dependències:** M1 (DB Foundation), M2 (Admin UI), Pre-requisit: Context Provider d'Autenticació

---

## 1. Visió General

El Contingut Base permet als editors gestionar el catàleg de vídeos del seu centre:
- ✅ Crear vídeos amb validació de Vimeo en temps real
- ✅ Editar metadades (títol, descripció, tags, hashtags)
- ✅ Classificar amb etiquetes globals i hashtags de centre
- ✅ Activar compartició amb altres centres
- ✅ Filtrar i cercar vídeos
- ✅ Visualitzar vídeos propis i compartits d'altres centres

**Simplificacions de M3a:**
- ❌ Sense moderació (tot es publica directament)
- ❌ Sense notificacions
- ✅ Editor-profe pot crear/editar/esborrar vídeos
- ✅ Editor-alumne només pot visualitzar (lectura)
- ⏭️ Moderació d'alumnes → M3b

**Principis de disseny:**
- Interfície clean i funcional
- Colors de marca (groc `#FEDD2C`, magenta `#F91248`, turquesa `#16AFAA`)
- Tipografia: Montserrat (títols) + Inter (contingut)
- Validació Vimeo en temps real amb feedback visual

---

## ⚠️ PRE-REQUISIT TÈCNIC: Context Provider d'Autenticació

**ABANS de començar M3a**, cal implementar el sistema d'autenticació al layout per filtrar el menú segons el rol real de l'usuari.

### Context Provider Simplificat

**NO cal fer queries a `public.users`**. Utilitzarem `user_metadata` de Supabase Auth:

```typescript
// utils/supabase/useAuth.ts
import { createClient } from './client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Obtenir usuari inicial
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // Subscriure's a canvis d'autenticació
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const role = user?.user_metadata?.role as 
    | 'admin_global' 
    | 'editor_profe' 
    | 'editor_alumne' 
    | 'display'
    | undefined

  const centerId = user?.user_metadata?.center_id as string | undefined

  return { user, role, centerId, loading }
}
```

### Integració al Layout

```typescript
// app/components/layout/AppSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/utils/supabase/useAuth';

interface SidebarItem {
  id: string;
  icon: string;
  label: string;
  href: string;
  roles: string[];
}

const sidebarItems: SidebarItem[] = [
  { id: 'visor', icon: '📺', label: 'Visor', href: '/visor', roles: ['admin_global', 'editor_profe', 'editor_alumne', 'display'] },
  { id: 'contingut', icon: '📹', label: 'Contingut', href: '/contingut', roles: ['editor_profe', 'editor_alumne', 'admin_global'] },
  { id: 'llistes', icon: '📋', label: 'Llistes', href: '/llistes', roles: ['editor_profe', 'admin_global'] },
  { id: 'rss', icon: '📡', label: 'RSS', href: '/rss', roles: ['editor_profe', 'admin_global'] },
  { id: 'usuaris', icon: '👥', label: 'Usuaris', href: '/usuaris', roles: ['editor_profe', 'admin_global'] },
  { id: 'admin', icon: '⚙️', label: 'Administració', href: '/admin', roles: ['admin_global'] },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <aside className="w-[70px] bg-gradient-to-b from-[#FEDD2C] to-[#FFF7CF] border-r border-[#E5E7EB] fixed left-0 top-[60px] bottom-0 z-40">
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-gray-500">...</div>
        </div>
      </aside>
    );
  }

  const visibleItems = sidebarItems.filter(item => 
    role && item.roles.includes(role)
  );

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <aside className="w-[70px] bg-gradient-to-b from-[#FEDD2C] to-[#FFF7CF] border-r border-[#E5E7EB] fixed left-0 top-[60px] bottom-0 z-40 shadow-sm">
      <nav className="flex flex-col h-full">
        <div className="flex-1 flex flex-col gap-2 p-2">
          {visibleItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              title={item.label}
              className={`
                relative h-12 flex items-center justify-center rounded-lg
                transition-all duration-200
                ${isActive(item.href)
                  ? 'bg-white/80 shadow-md before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[var(--color-accent)] before:rounded-r'
                  : 'hover:bg-white/50'
                }
              `}
            >
              <span className="text-2xl">{item.icon}</span>
            </Link>
          ))}
        </div>

        {/* Profile at bottom */}
        <div className="p-2 border-t border-[#E5E7EB]/50">
          <Link
            href="/perfil"
            title="Perfil"
            className={`
              h-12 flex items-center justify-center rounded-lg
              transition-all duration-200
              ${pathname === '/perfil'
                ? 'bg-white/80 shadow-md'
                : 'hover:bg-white/50'
              }
            `}
          >
            <span className="text-2xl">👤</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
```

### Header Dinàmic

```typescript
// app/components/layout/AppHeader.tsx
'use client';

import { useAuth } from '@/utils/supabase/useAuth';

const ROLE_LABELS: Record<string, string> = {
  admin_global: 'Admin Global',
  editor_profe: 'Editor Professor',
  editor_alumne: 'Editor Alumne',
  display: 'Display',
};

export default function AppHeader() {
  const { user, role } = useAuth();

  return (
    <header className="h-[60px] bg-white border-b border-[#E5E7EB] fixed top-0 left-0 right-0 z-50">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold font-[family-name:var(--font-montserrat)]">
            PUBLICAT
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {role && (
            <span className="text-sm text-[var(--color-gray)] font-[family-name:var(--font-inter)]">
              {ROLE_LABELS[role]}
            </span>
          )}
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
            <span className="text-lg font-semibold">
              {user?.email?.[0].toUpperCase() || '?'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
```

### Criteris d'Acceptació Pre-M3a

- [x] `useAuth()` retorna dades reals de l'usuari autenticat
- [x] Sidebar filtra ítems segons `role` real (no hardcoded)
- [x] Header mostra rol traduït correctament
- [x] Editor-alumne NO veu RSS, Usuaris ni Administració
- [x] Admin Global veu totes les seccions
- [x] Loading state mentre es carrega l'autenticació

**Temps estimat:** 0.5 dies (implementar abans de M3a)

---

## 2. Pàgina de Contingut (`/contingut`)

### 2.1 Estructura Visual

```
┌────────────────────────────────────────────────────────────────┐
│  HEADER (60px fix) + SIDEBAR (70px)                            │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│  Breadcrumb: Home > Contingut                                  │
├────────────────────────────────────────────────────────────────┤
│  CAPÇALERA                                                      │
│  Contingut                                    [+ Pujar Vídeo]  │
│  Gestió de vídeos del centre                                   │
├────────────────────────────────────────────────────────────────┤
│  FILTRES (col·lapsable)                                        │
│  🔍 Cerca per títol...                                         │
│  Centre: [Selector] Zona: [Selector] Tipus: [Selector]        │
│  Tags: [Multi-select] Hashtags: [Multi-select]                │
│  ☐ Incloure vídeos compartits d'altres centres                │
├────────────────────────────────────────────────────────────────┤
│  GRAELLA DE VÍDEOS (4 columnes, responsive)                    │
│                                                                 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                 │
│  │ Video1 │ │ Video2 │ │ Video3 │ │ Video4 │                 │
│  │ [img]  │ │ [img]  │ │ [img]  │ │ [img]  │                 │
│  │ Títol  │ │ Títol  │ │ Títol  │ │ Títol  │                 │
│  │ Centre │ │ Centre │ │ Centre │ │ Centre │                 │
│  │ 2:34   │ │ 5:12   │ │ 1:45   │ │ 3:28   │                 │
│  │ [tags] │ │ [tags] │ │ [tags] │ │ [tags] │                 │
│  │ ✏️ 🗑️  │ │ ✏️ 🗑️  │ │ ✏️ 🗑️  │ │ ✏️ 🗑️  │                 │
│  └────────┘ └────────┘ └────────┘ └────────┘                 │
│                                                                 │
│  Mostrant 1-24 de 156 vídeos          [1] 2 3 4 5 >          │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Targeta de Vídeo (VideoCard)

**Disseny:**
```
┌──────────────────────────────────────┐
│ [Thumbnail 16:9]                     │
│                                      │
│  🎬 Anunci | 📹 Contingut            │
│  🌐 Compartit | 🏫 Només centre     │
├──────────────────────────────────────┤
│ Títol del vídeo                      │
│ Institut Exemple · Bages             │
│                                      │
│ World Esports Tech                   │
│ #batx2 #projecte                     │
│                                      │
│ 2:34 · Pujat fa 3 dies              │
│                                      │
│ [✏️ Editar] [🗑️ Esborrar] [📋 +Llista]│
└──────────────────────────────────────┘
```

**Estils:**
```css
.video-card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  overflow: hidden;
  transition: all 200ms;
}

.video-card:hover {
  border-color: #16AFAA;
  box-shadow: 0 4px 12px rgba(22, 175, 170, 0.15);
  transform: translateY(-2px);
}

.video-thumbnail {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
  background: #F9FAFB;
}

.video-badges {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
}

.badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.95);
}

.badge-announcement {
  color: #F91248; /* Magenta */
}

.badge-content {
  color: #16AFAA; /* Turquesa */
}

.badge-shared {
  background: #16AFAA;
  color: white;
}
```

### 2.3 Permisos de Visualització

**Editor-profe:**
- Veu tots els vídeos del seu centre (tots els estats)
- Veu vídeos compartits d'altres centres (si activa el checkbox)
- Pot editar/esborrar vídeos del seu centre
- Pot activar/desactivar compartició

**Editor-alumne:**
- Veu vídeos `published` del seu centre (només lectura)
- Veu vídeos compartits d'altres centres (si activa el checkbox)
- **NO** pot editar ni esborrar vídeos
- **NO** veu botons d'acció

**Admin-global:**
- Veu tots els vídeos de tots els centres
- Pot editar/esborrar qualsevol vídeo

---

## 3. Sistema de Filtres

### 3.1 Panell de Filtres

**Components:**
```typescript
interface FilterState {
  search: string;
  centerId: string | null;
  zoneId: string | null;
  type: 'all' | 'content' | 'announcement';
  tagIds: string[];
  hashtagIds: string[];
  includeShared: boolean;
}
```

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ 🔍 FILTRES                              [Netejar tot] [X]  │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Cerca per títol                                            │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 🔍 Escriu per cercar...                             │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Centre                          Zona                       │
│ ┌──────────────────┐            ┌──────────────────┐      │
│ │ El meu centre ▼  │            │ Totes les zones▼ │      │
│ └──────────────────┘            └──────────────────┘      │
│                                                             │
│ Tipus de vídeo                                             │
│ ⚪ Tots   ⚪ Contingut   ⚪ Anuncis                        │
│                                                             │
│ Etiquetes Globals (mínim 1)                               │
│ ☐ World      ☐ Esports     ☐ Meteorologia                │
│ ☐ Espanya    ☐ TECH        ☐ Efemèrides                  │
│ ☐ Catalunya  ☐ Música      ☐ Curiositats                 │
│ ☐ Arts       ☐ Vida al centre ☐ Dites i refranys        │
│                                                             │
│ Hashtags del Centre (opcional)                            │
│ ☐ #batx2     ☐ #tr25       ☐ #viatgeRoma                 │
│ ☐ #república                                              │
│                                                             │
│ ☑ Incloure vídeos compartits d'altres centres             │
│                                                             │
│           [Cancel·lar]  [Aplicar Filtres]                 │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Comportament dels Filtres

**Per defecte:**
- Centre: El meu centre
- Zona: Totes
- Tipus: Tots
- Tags: Cap seleccionat
- Hashtags: Cap seleccionat
- Compartits: NO (només vídeos del centre)

**Cerca en temps real:**
- Debounce de 300ms
- Cerca per títol i descripció
- Case-insensitive

**Filtres combinables:**
- Tots els filtres s'apliquen amb `AND`
- Tags amb `OR` (si selecciones World + Esports, mostra vídeos amb World O Esports)
- Hashtags amb `OR`

### 3.3 Badge de Filtres Actius

```tsx
// Component FilterBadges
<div className="flex gap-2 flex-wrap mb-4">
  {activeFilters.map(filter => (
    <span key={filter.key} className="badge-filter">
      {filter.label}
      <button onClick={() => removeFilter(filter.key)}>✕</button>
    </span>
  ))}
  {activeFilters.length > 0 && (
    <button onClick={clearAllFilters} className="text-sm text-[var(--color-gray)] hover:text-[var(--color-accent)]">
      Netejar tot
    </button>
  )}
</div>
```

---

## 4. Creació de Vídeos

### 4.1 Modal Pujar Vídeo

**Formulari:**
```
┌────────────────────────────────────────────────────────┐
│  [X] Pujar Nou Vídeo                                   │
├────────────────────────────────────────────────────────┤
│                                                         │
│  URL de Vimeo *                                        │
│  ┌───────────────────────────────────────────────┐    │
│  │ https://vimeo.com/123456789                   │    │
│  └───────────────────────────────────────────────┘    │
│  ⏳ Validant vídeo...                                  │
│                                                         │
│  [DESPRÉS DE VALIDACIÓ]                                │
│                                                         │
│  ✓ Vídeo trobat i accessible                          │
│  ┌─────────────────────────────────────────────┐      │
│  │ [Thumbnail de Vimeo 640x360]                │      │
│  │ Durada: 2:34                                 │      │
│  └─────────────────────────────────────────────┘      │
│                                                         │
│  Títol *                                               │
│  ┌───────────────────────────────────────────────┐    │
│  │ Vídeo Nadal 2025 (autocompletat de Vimeo)    │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  Descripció                                            │
│  ┌───────────────────────────────────────────────┐    │
│  │ Celebració del Nadal...                       │    │
│  │                                                │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  Tipus *                                               │
│  ⚪ Contingut   ⚪ Anunci                              │
│                                                         │
│  Etiquetes Globals * (mínim 1)                        │
│  ☑ World  ☐ Espanya  ☑ Efemèrides                    │
│  ☐ Esports ... (grid de 12 etiquetes)                │
│                                                         │
│  Hashtags del Centre (opcional)                       │
│  ┌───────────────────────────────────────────────┐    │
│  │ #batx2, #nadal                                │    │
│  └───────────────────────────────────────────────┘    │
│  💡 Escriu hashtags separats per comes                │
│  💡 Es crearan automàticament si no existeixen        │
│                                                         │
│  ☐ Compartir amb altres centres                       │
│     (Només Editor-profe)                              │
│                                                         │
│  ℹ️  Centre i Zona s'assignen automàticament          │
│                                                         │
│           [Cancel·lar]  [Pujar Vídeo]                 │
└────────────────────────────────────────────────────────┘
```

### 4.2 Validació de Vimeo en Temps Real

**Flux:**
1. Usuari enganxa URL de Vimeo
2. Sistema detecta format vàlid (regex)
3. Crida API `/api/vimeo/validate` amb debounce 500ms
4. Mostra loading spinner
5. Si vàlid:
   - Mostra thumbnail
   - Autoomplena títol
   - Mostra durada
   - Activa botó "Pujar Vídeo"
6. Si error:
   - Mostra missatge d'error
   - Desactiva botó "Pujar Vídeo"

**Errors possibles:**
- URL no vàlida
- Vídeo no trobat (404)
- Vídeo privat/amb contrasenya (403)
- Error de connexió amb Vimeo

**Component `VimeoUrlInput`:**
```tsx
interface VimeoValidationState {
  status: 'idle' | 'validating' | 'valid' | 'error';
  videoId: string | null;
  thumbnail: string | null;
  title: string | null;
  duration: number | null;
  error: string | null;
}

export function VimeoUrlInput({ value, onChange, onValidation }) {
  const [validation, setValidation] = useState<VimeoValidationState>({
    status: 'idle',
    videoId: null,
    thumbnail: null,
    title: null,
    duration: null,
    error: null,
  });

  const validateUrl = useDebouncedCallback(async (url: string) => {
    if (!url) {
      setValidation({ status: 'idle', ... });
      return;
    }

    setValidation({ status: 'validating', ... });

    try {
      const res = await fetch('/api/vimeo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (res.ok) {
        setValidation({
          status: 'valid',
          videoId: data.videoId,
          thumbnail: data.thumbnail,
          title: data.title,
          duration: data.duration,
          error: null,
        });
        onValidation(data);
      } else {
        setValidation({
          status: 'error',
          error: data.error,
          ...
        });
      }
    } catch (error) {
      setValidation({
        status: 'error',
        error: 'Error de connexió amb Vimeo',
        ...
      });
    }
  }, 500);

  return (
    <div>
      <input
        type="url"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          validateUrl(e.target.value);
        }}
        placeholder="https://vimeo.com/123456789"
      />
      
      {validation.status === 'validating' && (
        <div className="text-sm text-gray-500 mt-2">
          ⏳ Validant vídeo...
        </div>
      )}
      
      {validation.status === 'valid' && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-4">
            <img 
              src={validation.thumbnail} 
              alt="Thumbnail" 
              className="w-32 h-18 object-cover rounded"
            />
            <div>
              <p className="text-green-700 font-medium">✓ Vídeo trobat i accessible</p>
              <p className="text-sm text-gray-600">Durada: {formatDuration(validation.duration)}</p>
            </div>
          </div>
        </div>
      )}
      
      {validation.status === 'error' && (
        <div className="mt-2 text-sm text-red-600">
          ❌ {validation.error}
        </div>
      )}
    </div>
  );
}
```

### 4.3 Gestió d'Hashtags

**Creació automàtica:**
```typescript
// Quan l'usuari escriu "#batx2, #nadal, #projecte"
// El sistema:
// 1. Parseja els hashtags (split per comes, trim, lowercase)
// 2. Comprova quins existeixen a la BD per aquest centre
// 3. Crea els nous automàticament
// 4. Retorna els IDs per assignar al vídeo

async function processHashtags(
  input: string, 
  centerId: string
): Promise<string[]> {
  const hashtags = input
    .split(',')
    .map(h => h.trim().toLowerCase())
    .filter(h => h.startsWith('#'))
    .map(h => h.slice(1)); // Treure el #

  const { data: existing } = await supabase
    .from('hashtags')
    .select('id, name')
    .eq('center_id', centerId)
    .in('name', hashtags);

  const existingNames = existing?.map(h => h.name) || [];
  const newHashtags = hashtags.filter(h => !existingNames.includes(h));

  // Crear nous hashtags
  if (newHashtags.length > 0) {
    await supabase
      .from('hashtags')
      .insert(
        newHashtags.map(name => ({
          name,
          center_id: centerId,
          is_active: true,
        }))
      );
  }

  // Obtenir tots els IDs
  const { data: allHashtags } = await supabase
    .from('hashtags')
    .select('id')
    .eq('center_id', centerId)
    .in('name', hashtags);

  return allHashtags?.map(h => h.id) || [];
}
```

---

## 5. Edició de Vídeos

### 5.1 Modal Editar Vídeo

**Diferències amb creació:**
- URL de Vimeo NO editable (disabled)
- Resta de camps editables
- Botó "Actualitzar" en lloc de "Pujar"

**Validacions:**
- Mínim 1 etiqueta global
- Títol no buit
- Si tipus = 'announcement', avisar que només es mostrarà a la llista d'Anuncis

### 5.2 Permisos d'Edició

**Editor-profe:**
- Pot editar tots els camps
- Pot activar/desactivar compartició
- Pot canviar tipus (content ↔ announcement)

**Editor-alumne:**
- NO pot editar (només lectura en M3a)
- En M3b podrà editar els seus vídeos pendents

**Admin-global:**
- Pot editar qualsevol vídeo de qualsevol centre

---

## 6. Integració amb Vimeo

### 6.1 API Route de Validació

```typescript
// app/api/vimeo/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { extractVimeoId, getVimeoVideoData } from '@/lib/vimeo';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    // Validar format URL
    const videoId = extractVimeoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'URL de Vimeo no vàlida' },
        { status: 400 }
      );
    }
    
    // Obtenir metadades de Vimeo
    const data = await getVimeoVideoData(videoId);
    
    if (!data.isAccessible) {
      return NextResponse.json(
        { error: 'Aquest vídeo no és accessible públicament a Vimeo' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      videoId,
      title: data.title,
      thumbnail: data.thumbnail,
      duration: data.duration,
    });
    
  } catch (error) {
    if (error.message === 'VIDEO_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Vídeo no trobat a Vimeo' },
        { status: 404 }
      );
    }
    
    if (error.message === 'VIDEO_PRIVATE') {
      return NextResponse.json(
        { error: 'Aquest vídeo és privat o té contrasenya' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error de connexió amb Vimeo' },
      { status: 500 }
    );
  }
}
```

### 6.2 Utilitats de Vimeo

```typescript
// lib/vimeo/utils.ts
export function extractVimeoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /vimeo\.com\/video\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
```

```typescript
// lib/vimeo/api.ts
interface VimeoVideoData {
  title: string;
  description: string | null;
  thumbnail: string;
  duration: number;
  isAccessible: boolean;
  privacy: string;
}

export async function getVimeoVideoData(
  videoId: string
): Promise<VimeoVideoData> {
  const response = await fetch(
    `https://api.vimeo.com/videos/${videoId}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
        'Accept': 'application/vnd.vimeo.*+json;version=3.4',
      },
      next: { revalidate: 3600 }, // Cache 1 hora
    }
  );
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('VIDEO_NOT_FOUND');
    }
    if (response.status === 403) {
      throw new Error('VIDEO_PRIVATE');
    }
    throw new Error('VIMEO_API_ERROR');
  }
  
  const data = await response.json();
  
  // Seleccionar thumbnail de 640px
  const thumbnail = data.pictures.sizes.find(s => s.width === 640)?.link 
    || data.pictures.sizes[0]?.link;
  
  return {
    title: data.name,
    description: data.description || null,
    thumbnail,
    duration: data.duration,
    isAccessible: data.privacy.view === 'anybody',
    privacy: data.privacy.view,
  };
}
```

---

## 7. API Routes de Contingut

### 7.1 GET /api/videos

**Query parameters:**
```typescript
interface VideosQuery {
  centerId?: string;       // Filtre per centre
  zoneId?: string;         // Filtre per zona
  type?: 'content' | 'announcement' | 'all';
  tagIds?: string;         // Comma-separated
  hashtagIds?: string;     // Comma-separated
  includeShared?: boolean; // Incloure vídeos compartits d'altres centres
  search?: string;         // Cerca per títol/descripció
  page?: number;           // Paginació
  limit?: number;          // Items per pàgina (default: 24)
}
```

**Exemple:**
```
GET /api/videos?centerId=uuid&includeShared=true&tagIds=uuid1,uuid2&page=1
```

**Resposta:**
```json
{
  "videos": [
    {
      "id": "uuid",
      "title": "Vídeo Nadal 2025",
      "description": "...",
      "type": "content",
      "status": "published",
      "thumbnail_url": "https://i.vimeocdn.com/...",
      "duration_seconds": 154,
      "vimeo_url": "https://vimeo.com/123456789",
      "is_shared_with_other_centers": true,
      "center": {
        "id": "uuid",
        "name": "Institut Exemple",
        "zone": {
          "id": "uuid",
          "name": "Bages"
        }
      },
      "tags": [
        { "id": "uuid", "name": "World" },
        { "id": "uuid", "name": "Efemèrides" }
      ],
      "hashtags": [
        { "id": "uuid", "name": "batx2" }
      ],
      "uploaded_by": {
        "id": "uuid",
        "full_name": "Joan Pérez",
        "email": "joan@exemple.cat"
      },
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 156,
  "page": 1,
  "totalPages": 7
}
```

### 7.2 POST /api/videos

**Body:**
```json
{
  "vimeo_url": "https://vimeo.com/123456789",
  "title": "Vídeo Nadal 2025",
  "description": "Celebració del Nadal...",
  "type": "content",
  "tag_ids": ["uuid1", "uuid2"],
  "hashtag_names": "#batx2, #nadal",
  "is_shared_with_other_centers": false
}
```

**Validacions:**
- Vimeo URL vàlida i accessible
- Mínim 1 tag
- Títol no buit
- Usuari té permís per crear vídeos

**Resposta:**
```json
{
  "video": { ... },
  "message": "Vídeo pujat correctament"
}
```

### 7.3 PATCH /api/videos/[id]

**Body:**
```json
{
  "title": "Nou títol",
  "description": "Nova descripció",
  "type": "announcement",
  "tag_ids": ["uuid1", "uuid3"],
  "hashtag_names": "#batx2, #projecte",
  "is_shared_with_other_centers": true
}
```

**Validacions:**
- Usuari té permís per editar aquest vídeo
- Vídeo pertany al centre de l'usuari (o és admin_global)

### 7.4 DELETE /api/videos/[id]

**Validacions:**
- Usuari té permís per esborrar aquest vídeo
- Confirmació de l'usuari

**Resposta:**
```json
{
  "message": "Vídeo esborrat correctament"
}
```

---

## 8. Components Reutilitzables

### 8.1 Components de Visualització

**`<VideoCard>`**
```tsx
interface VideoCardProps {
  video: Video;
  onEdit?: (video: Video) => void;
  onDelete?: (video: Video) => void;
  onAddToPlaylist?: (video: Video) => void;
  showActions?: boolean; // Editor-profe: true, Editor-alumne: false
}
```

**`<VideoGrid>`**
```tsx
interface VideoGridProps {
  videos: Video[];
  loading?: boolean;
  onEdit?: (video: Video) => void;
  onDelete?: (video: Video) => void;
  showActions?: boolean;
}
```

**`<VideoBadge>`**
```tsx
interface VideoBadgeProps {
  type: 'announcement' | 'content' | 'shared' | 'center-only';
}
```

### 8.2 Components de Formulari

**`<VideoForm>`**
```tsx
interface VideoFormProps {
  mode: 'create' | 'edit';
  video?: Video;
  onSubmit: (data: VideoFormData) => void;
  onCancel: () => void;
}
```

**`<VimeoUrlInput>`**
```tsx
interface VimeoUrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidation: (data: VimeoValidationResult) => void;
  disabled?: boolean;
}
```

**`<TagSelector>`**
```tsx
interface TagSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  required?: boolean;
  minSelection?: number;
}
```

**`<HashtagInput>`**
```tsx
interface HashtagInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[]; // Hashtags existents del centre
}
```

### 8.3 Components de Filtres

**`<FilterPanel>`**
```tsx
interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClear: () => void;
  centers: Center[];
  zones: Zone[];
  tags: Tag[];
  hashtags: Hashtag[];
}
```

**`<FilterBadges>`**
```tsx
interface FilterBadgesProps {
  activeFilters: ActiveFilter[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}
```

---

## 9. Hooks Personalitzats

### 9.1 useVideos

```typescript
interface UseVideosOptions {
  filters: FilterState;
  page: number;
  limit: number;
}

export function useVideos(options: UseVideosOptions) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, [options]);

  async function fetchVideos() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: options.page.toString(),
        limit: options.limit.toString(),
      });

      if (options.filters.centerId) {
        params.append('centerId', options.filters.centerId);
      }
      // ... afegir altres filtres

      const res = await fetch(`/api/videos?${params}`);
      const data = await res.json();

      if (res.ok) {
        setVideos(data.videos);
        setTotal(data.total);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error carregant vídeos');
    } finally {
      setLoading(false);
    }
  }

  return {
    videos,
    loading,
    error,
    total,
    totalPages: Math.ceil(total / options.limit),
    refetch: fetchVideos,
  };
}
```

### 9.2 useVimeoValidation

```typescript
export function useVimeoValidation() {
  const [state, setState] = useState<VimeoValidationState>({
    status: 'idle',
    videoId: null,
    thumbnail: null,
    title: null,
    duration: null,
    error: null,
  });

  const validate = useDebouncedCallback(async (url: string) => {
    if (!url) {
      setState({ status: 'idle', ... });
      return;
    }

    setState({ status: 'validating', ... });

    try {
      const res = await fetch('/api/vimeo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (res.ok) {
        setState({
          status: 'valid',
          videoId: data.videoId,
          thumbnail: data.thumbnail,
          title: data.title,
          duration: data.duration,
          error: null,
        });
      } else {
        setState({
          status: 'error',
          videoId: null,
          thumbnail: null,
          title: null,
          duration: null,
          error: data.error,
        });
      }
    } catch (error) {
      setState({
        status: 'error',
        error: 'Error de connexió amb Vimeo',
        ...
      });
    }
  }, 500);

  return {
    state,
    validate,
    reset: () => setState({ status: 'idle', ... }),
  };
}
```

---

## 10. Criteris d'Acceptació

### 10.1 Funcionals

- [x] Editor-profe pot crear vídeos amb URL de Vimeo
- [x] Validació de Vimeo funciona en temps real
- [x] Thumbnail i metadades s'autocompleten des de Vimeo
- [x] Sistema de tags globals funciona (mínim 1 obligatori)
- [x] Sistema de hashtags de centre funciona (opcionals, creació automàtica)
- [x] Editor-profe pot editar vídeos del seu centre
- [x] Editor-profe pot esborrar vídeos del seu centre
- [x] Editor-profe pot activar compartició amb altres centres
- [x] Editor-alumne veu vídeos en mode lectura (sense botons d'acció)
- [x] Filtres funcionen correctament (centre, zona, tipus, tags, hashtags)
- [x] Checkbox "Incloure vídeos compartits" funciona
- [x] Cerca per títol/descripció funciona
- [x] Paginació funciona (24 vídeos per pàgina)

### 10.2 UI/UX

- [x] Colors de marca aplicats (groc, magenta, turquesa)
- [x] Tipografia Montserrat + Inter
- [x] Graella responsive (4-3-2-1 columnes segons viewport)
- [x] Hover states amb transicions suaus
- [x] Loading states durant validació de Vimeo
- [x] Missatges d'error clars i accionables
- [x] Confirmació abans d'esborrar vídeo
- [x] Toast notifications per accions correctes

### 10.3 Tècnics

- [x] API routes protegides amb validació de rol
- [x] RLS policies permeten:
  - Editor-profe: CRUD vídeos del seu centre
  - Editor-alumne: SELECT vídeos published
  - Admin-global: CRUD tots els vídeos
- [x] Validació Vimeo amb caché (1 hora)
- [x] Hashtags es creen automàticament
- [x] Queries optimitzades amb índexs
- [x] Paginació al backend (limit/offset)
- [x] Debounce en cerca i validació Vimeo

### 10.4 Integració

- [x] Vimeo Access Token configurat
- [x] Variables d'entorn configurades
- [x] API de Vimeo funciona correctament
- [x] Gestió d'errors de Vimeo (404, 403, 500)
- [x] Thumbnails es carreguen des de Vimeo CDN

---

## 11. Tasques d'Implementació

### Fase 1: Setup i Pre-requisit (0.5 dies)

**1. Context Provider d'Autenticació**
- [ ] Crear `utils/supabase/useAuth.ts`
- [ ] Actualitzar `AppSidebar.tsx` per usar `useAuth()`
- [ ] Actualitzar `AppHeader.tsx` per mostrar rol
- [ ] Eliminar rol hardcoded
- [ ] Testejar amb diferents rols

**2. Configuració Vimeo**
- [ ] Obtenir Vimeo Access Token
- [ ] Afegir `VIMEO_ACCESS_TOKEN` a `.env.local`
- [ ] Afegir variable a Vercel
- [ ] Crear `lib/vimeo/utils.ts`
- [ ] Crear `lib/vimeo/api.ts`
- [ ] Testejar connexió amb Vimeo

### Fase 2: API Routes (1 dia)

**3. API Route de Validació Vimeo**
- [ ] Crear `/api/vimeo/validate/route.ts`
- [ ] Implementar validació d'URL
- [ ] Implementar obtenció de metadades
- [ ] Gestió d'errors (404, 403, 500)
- [ ] Testejar amb diferents URLs

**4. API Routes de Vídeos**
- [ ] Crear `/api/videos/route.ts` (GET, POST)
- [ ] Crear `/api/videos/[id]/route.ts` (PATCH, DELETE)
- [ ] Implementar filtres i paginació
- [ ] Implementar processament d'hashtags
- [ ] Validacions de permissos
- [ ] Testejar amb diferents rols

### Fase 3: Components Base (1.5 dies)

**5. Components de Visualització**
- [ ] Crear `VideoCard.tsx`
- [ ] Crear `VideoGrid.tsx`
- [ ] Crear `VideoBadge.tsx`
- [ ] Crear `FilterBadges.tsx`
- [ ] Estils amb colors de marca

**6. Components de Formulari**
- [ ] Crear `VideoForm.tsx`
- [ ] Crear `VimeoUrlInput.tsx` amb validació en temps real
- [ ] Crear `TagSelector.tsx`
- [ ] Crear `HashtagInput.tsx`
- [ ] Validacions client-side

**7. Components de Filtres**
- [ ] Crear `FilterPanel.tsx`
- [ ] Implementar filtres combinables
- [ ] Implementar cerca amb debounce
- [ ] Botó "Netejar filtres"

### Fase 4: Pàgina de Contingut (1.5 dies)

**8. Layout de la Pàgina**
- [ ] Crear `/contingut/page.tsx`
- [ ] Integrar `FilterPanel`
- [ ] Integrar `VideoGrid`
- [ ] Integrar paginació
- [ ] Botó "Pujar Vídeo"

**9. Modal de Creació**
- [ ] Crear modal amb `VideoForm`
- [ ] Implementar flux de creació
- [ ] Validació de Vimeo en temps real
- [ ] Autocompletar metadades
- [ ] Gestió d'hashtags

**10. Modal d'Edició**
- [ ] Reutilitzar `VideoForm` en mode edit
- [ ] Carregar dades del vídeo
- [ ] Implementar actualització
- [ ] Confirmació de canvis

**11. Eliminació de Vídeos**
- [ ] Modal de confirmació
- [ ] Implementar eliminació
- [ ] Actualitzar llista després d'esborrar
- [ ] Toast notification

### Fase 5: Hooks i Utilitats (0.5 dies)

**12. Hooks Personalitzats**
- [ ] Crear `useVideos`
- [ ] Crear `useVimeoValidation`
- [ ] Crear `useDebouncedCallback`

**13. Utilitats**
- [ ] Funció `formatDuration`
- [ ] Funció `extractVimeoId`
- [ ] Funció `processHashtags`

### Fase 6: Testing i Poliment (1 dia)

**14. Tests Funcionals**
- [ ] Testejar creació de vídeo amb cada rol
- [ ] Testejar edició amb cada rol
- [ ] Testejar eliminació amb cada rol
- [ ] Testejar filtres (tots els tipus)
- [ ] Testejar paginació
- [ ] Testejar cerca
- [ ] Testejar compartició

**15. Tests d'Integració Vimeo**
- [ ] URL vàlida → autocompletar metadades
- [ ] URL invàlida → missatge d'error
- [ ] Vídeo privat → missatge d'error
- [ ] Vídeo no trobat → missatge d'error

**16. Poliment UI**
- [ ] Animacions i transicions
- [ ] Loading states
- [ ] Error states
- [ ] Empty states (sense vídeos)
- [ ] Responsive design
- [ ] Tooltips i ajudes

---

## 12. Riscos i Mitigacions

| Risc | Probabilitat | Impacte | Mitigació |
|------|--------------|---------|-----------|
| **Vimeo API canvia** | 🟡 Mitjana | 🟡 Mitjà | Abstraure en lib separada + tests |
| **Vídeos privats/password** | 🟡 Mitjana | 🟢 Baix | Validació + missatge clar |
| **Hashtags duplicats** | 🟢 Baixa | 🟢 Baix | Normalització (lowercase, trim) |
| **RLS policies incorrectes** | 🟡 Mitjana | 🔴 Alt | Tests exhaustius per cada rol |
| **Thumbnails no es carreguen** | 🟢 Baixa | 🟡 Mitjà | Fallback a imatge per defecte |
| **Paginació lenta** | 🟡 Mitjana | 🟡 Mitjà | Índexs + limit queries |

---

## 13. Mètriques d'Èxit

**Funcionals:**
- [ ] 100% dels vídeos validats correctament amb Vimeo
- [ ] 0 errors en creació de vídeos vàlids
- [ ] Filtres retornen resultats en <500ms (p95)

**UI/UX:**
- [ ] Temps de càrrega pàgina <2s
- [ ] Validació Vimeo <1s (p95)
- [ ] 0 errors de JavaScript en consola

**Qualitat:**
- [ ] Tests cobreixen >80% dels fluxos crítics
- [ ] Documentació API completa
- [ ] Components reutilitzables documentats

---

## 14. Pròxims Passos (Post-M3a)

Un cop completat M3a, el següent sub-milestone serà:

**M3b - Moderació Alumnes**
- Editor-alumne pot pujar vídeos (queden `pending_approval`)
- Editor-profe rep notificació
- Dashboard de moderació (`/moderacio`)
- Sistema de notificacions amb Supabase Realtime
- Aprovar/rebutjar vídeos

---

## Notes Finals

Aquest milestone estableix el **sistema de gestió de contingut base** del sistema, permetent als editors crear, editar i visualitzar vídeos amb validació en temps real de Vimeo i un sistema flexible de classificació amb tags i hashtags.

**Durada estimada:** 1 setmana  
**Prioritat:** Alta (bloqueador per M4, M5, M6)  
**Complexitat:** Mitjana-Alta (integració amb API externa + sistema de filtres complex)

**Dependències crítiques:**
- ✅ M1 completat (taules `videos`, `tags`, `hashtags`, `video_tags`, `video_hashtags`)
- ✅ M2 completat (sistema d'autenticació i gestió de centres)
- ✅ Context Provider d'Autenticació implementat
- ✅ Vimeo Access Token obtingut i configurat

---

**Data de creació:** 7 gener 2026  
**Estat:** Planificat, pendent implementació  
**Responsable:** Equip de desenvolupament
