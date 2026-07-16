# Milestone 4: Llistes de Reproducció

**Objectiu:** Sistema complet de gestió de playlists amb drag & drop per organitzar vídeos en diferents contextos (dies de la setmana, anuncis, llistes personalitzades i globals).

**Durada estimada:** 1.5 setmanes
**Dependències:** M3a completat (sistema de contingut amb vídeos)
**Risc:** 🟢 Baix (funcionalitat estàndard amb llibreries consolidades)
**Estat:** IMPLEMENTAT (19 gener 2026)

---

## 📋 Objectiu

Implementar un sistema de playlists flexible que permeti als centres organitzar els seus vídeos en diferents contextos de reproducció:

1. **Llistes predefinides per dia de la setmana** (7 llistes): Dilluns, Dimarts, Dimecres, Dijous, Divendres, Dissabte, Diumenge
2. **Llista d'Anuncis**: Llista especial que només accepta vídeos de tipus `announcement`
3. **Llistes personalitzades**: Creades pels Editor-profe per organitzacions específiques
4. **Llistes globals**: Creades per Admin global, copiables pels centres

Aquest sistema és **fonamental per M6 (Pantalla Principal)**, on els vídeos es reproduiran segons les llistes configurades.

---

## 🎯 Criteris d'Acceptació

### Funcionalitat Bàsica
- [x] 7 llistes predefinides + Anuncis creades automàticament per cada centre nou
- [x] Editor-profe pot veure totes les llistes del seu centre
- [x] Editor-profe pot crear llistes personalitzades
- [x] Editor-profe pot editar qualsevol llista (afegir/eliminar vídeos, reordenar)
- [x] Editor-profe pot eliminar llistes personalitzades (no predefinides)
- [x] Llista "Anuncis" només accepta vídeos amb `type = 'announcement'`
- [x] Validació automàtica al afegir vídeos a llista Anuncis

### Drag & Drop
- [x] Sistema de reordenació visual amb drag & drop funcional
- [x] Actualització de posicions en temps real
- [x] Feedback visual durant l'arrossegament (hover states, drop zones)
- [x] Suport per teclat (accessibilitat)

### Llistes Globals (Admin)
- [x] Admin global pot crear llistes globals (`center_id = NULL`)
- [x] Llistes globals visibles a tots els centres
- [x] Centre pot crear còpia local d'una llista global
- [x] Còpia local modificable sense afectar l'original
- [x] Indicador visual de llista global vs. local

### Permisos Editor-alumne
- [x] Si `is_student_editable = true`: Editor-alumne pot afegir/eliminar/reordenar vídeos
- [x] Si `is_student_editable = false`: Editor-alumne només pot veure (lectura)
- [x] Editor-alumne NO pot crear ni eliminar llistes

### Integració
- [x] API routes CRUD completes per playlists i playlist_items
- [x] RLS policies correctes per cada rol (aplicades a nivell API)
- [x] Trigger automàtic crea 8 llistes predefinides en crear un centre nou

---

## 📊 Estructura de Dades

### Taula `playlists`

| Camp | Tipus | Descripció |
|------|-------|------------|
| `id` | uuid | Identificador únic |
| `center_id` | uuid (nullable) | Centre propietari (NULL = llista global) |
| `name` | text | Nom de la llista |
| `kind` | playlist_kind | Tipus: `weekday`, `announcements`, `custom`, `global`, `landing` |
| `is_deletable` | boolean | Si es pot eliminar (false per predefinides) |
| `is_student_editable` | boolean | Si editor-alumne pot editar |
| `origin_playlist_id` | uuid (nullable) | Si és còpia d'una llista global |
| `created_by_user_id` | uuid (nullable) | Usuari creador |
| `is_active` | boolean | Si està activa |
| `created_at` | timestamptz | Data de creació |
| `updated_at` | timestamptz | Última actualització |

**Enum `playlist_kind`:**
```sql
'weekday'       -- Llistes predefinides dels dies (Dilluns, Dimarts, etc.)
'announcements' -- Llista especial d'anuncis
'custom'        -- Llistes personalitzades creades pels editors
'global'        -- Llistes globals creades per admin
'landing'       -- Llista de landing page (futur M7)
```

### Taula `playlist_items`

| Camp | Tipus | Descripció |
|------|-------|------------|
| `id` | uuid | Identificador únic |
| `playlist_id` | uuid | FK → playlists(id) |
| `video_id` | uuid | FK → videos(id) |
| `position` | int | Ordre dins la llista (0-indexed) |
| `added_at` | timestamptz | Quan s'ha afegit |
| `added_by_user_id` | uuid (nullable) | Qui l'ha afegit |

**Constraint UNIQUE:** `(playlist_id, position)` - No pot haver-hi dues posicions iguals en la mateixa llista.

---

## 🏗️ Arquitectura del Sistema

### 1. Creació Automàtica de Llistes Predefinides

Quan es crea un centre nou, el **trigger `create_default_playlists_for_center()`** (ja existent a la BD) crea automàticament:

```sql
-- 7 llistes de dies de la setmana
Dilluns   (kind: 'weekday', is_deletable: false)
Dimarts   (kind: 'weekday', is_deletable: false)
Dimecres  (kind: 'weekday', is_deletable: false)
Dijous    (kind: 'weekday', is_deletable: false)
Divendres (kind: 'weekday', is_deletable: false)
Dissabte  (kind: 'weekday', is_deletable: false)
Diumenge  (kind: 'weekday', is_deletable: false)

-- 1 llista d'anuncis
Anuncis   (kind: 'announcements', is_deletable: false)
```

Aquestes llistes NO es poden eliminar (`is_deletable = false`).

### 2. Workflow de Gestió de Llistes

```
┌────────────────────────────────────────────────────────────┐
│  Editor-profe accedeix a /llistes                          │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│  Veu llistat de llistes del centre:                        │
│  - 8 llistes predefinides (weekday + announcements)        │
│  - N llistes personalitzades (custom)                      │
│  - M llistes globals disponibles (còpies locals)           │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│  Opcions:                                                   │
│  1. Crear llista personalitzada                            │
│  2. Editar llista existent (click a "Editar")              │
│  3. Eliminar llista personalitzada                         │
│  4. Copiar llista global                                   │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼ (Opció 2: Editar)
┌────────────────────────────────────────────────────────────┐
│  Editor de Llista:                                          │
│  - Veu vídeos actuals (ordenats per position)             │
│  - Pot reordenar amb drag & drop                          │
│  - Pot afegir vídeos (modal amb cerca)                    │
│  - Pot eliminar vídeos                                     │
│  - Guardar canvis                                          │
└────────────────────────────────────────────────────────────┘
```

### 3. Restricció de Llista "Anuncis"

La llista "Anuncis" té una regla especial:

```typescript
// Validació al frontend
if (playlist.kind === 'announcements' && video.type !== 'announcement') {
  throw new Error('La llista Anuncis només pot contenir vídeos de tipus Anunci');
}

// Validació al backend (API route)
const playlist = await supabase
  .from('playlists')
  .select('kind')
  .eq('id', playlistId)
  .single();

if (playlist.kind === 'announcements') {
  const video = await supabase
    .from('videos')
    .select('type')
    .eq('id', videoId)
    .single();

  if (video.type !== 'announcement') {
    return NextResponse.json(
      { error: 'Aquesta llista només accepta vídeos de tipus Anunci' },
      { status: 400 }
    );
  }
}
```

---

## 🎨 Interfície d'Usuari

### Pàgina Principal: `/llistes`

```
┌────────────────────────────────────────────────────────────────┐
│  HEADER (60px fix) + SIDEBAR (70px)                            │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│  Breadcrumb: Home > Llistes de Reproducció                     │
├────────────────────────────────────────────────────────────────┤
│  CAPÇALERA                                                      │
│  Llistes de Reproducció            [+ Nova Llista]             │
│  Organitza els teus vídeos en llistes                          │
├────────────────────────────────────────────────────────────────┤
│  FILTRES                                                        │
│  ☐ Llistes predefinides  ☐ Personalitzades  ☐ Globals         │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📅 LLISTES PREDEFINIDES                                       │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Dilluns          [🎬 5 vídeos]        [✏️ Editar]   │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Dimarts          [🎬 3 vídeos]        [✏️ Editar]   │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Dimecres         [🎬 0 vídeos]        [✏️ Editar]   │    │
│  └──────────────────────────────────────────────────────┘    │
│  ... (Dijous, Divendres, Dissabte, Diumenge)                  │
│                                                                 │
│  📢 LLISTA ESPECIAL                                            │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Anuncis          [📣 2 vídeos]        [✏️ Editar]   │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                 │
│  📋 LLISTES PERSONALITZADES                                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Nadal 2025       [🎬 8 vídeos]  [✏️][🗑️]           │    │
│  │ 🔓 Editable per alumnes                               │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Viatge a Roma    [🎬 12 vídeos] [✏️][🗑️]           │    │
│  │ 🔒 Només editors                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                 │
│  🌍 LLISTES GLOBALS (Disponibles)                             │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Efemèrides Mundials  [🎬 25 vídeos]  [📋 Copiar]    │    │
│  │ Created by: Admin Global · Compartida amb tots       │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Card de Llista (Component `PlaylistCard`)

```typescript
interface PlaylistCardProps {
  playlist: Playlist;
  videoCount: number;
  onEdit: (id: string) => void;
  onDelete?: (id: string) => void; // Només per llistes personalitzades
  onCopy?: (id: string) => void;   // Només per llistes globals
}
```

**Disseny:**
```
┌──────────────────────────────────────────────────────────┐
│ 📅 Dilluns                                    [✏️ Editar] │
│                                                           │
│ 🎬 5 vídeos · Última actualització: fa 2 dies           │
│ Llista predefinida · No es pot eliminar                 │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 📋 Nadal 2025                            [✏️][🗑️]       │
│                                                           │
│ 🎬 8 vídeos · Creada fa 3 setmanes                      │
│ 🔓 Editable per alumnes                                  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 🌍 Efemèrides Mundials                   [📋 Copiar]    │
│                                                           │
│ 🎬 25 vídeos · Creada per Admin Global                  │
│ Llista global · Còpia local modificable                 │
└──────────────────────────────────────────────────────────┘
```

---

### Editor de Llista: `/llistes/[id]/editar`

```
┌────────────────────────────────────────────────────────────────┐
│  [← Tornar]  Editar Llista: Dilluns                           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ℹ️ Aquesta llista es reproduirà automàticament els dilluns   │
│                                                                 │
│  [🔍 Afegir vídeos]                          [💾 Guardar]     │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ VÍDEOS EN AQUESTA LLISTA (5)                           │  │
│  │                                                         │  │
│  │ ┌─────────────────────────────────────────────────┐   │  │
│  │ │ ⋮⋮ 1. Vídeo Matinal                    [✕]      │   │  │
│  │ │    Institut Exemple · Bages                     │   │  │
│  │ │    2:34 · World, Catalunya                      │   │  │
│  │ └─────────────────────────────────────────────────┘   │  │
│  │                                                         │  │
│  │ ┌─────────────────────────────────────────────────┐   │  │
│  │ │ ⋮⋮ 2. Notícies Catalanes              [✕]      │   │  │
│  │ │    Institut Exemple · Bages                     │   │  │
│  │ │    3:12 · Espanya, Tech                         │   │  │
│  │ └─────────────────────────────────────────────────┘   │  │
│  │                                                         │  │
│  │ ┌─────────────────────────────────────────────────┐   │  │
│  │ │ ⋮⋮ 3. Meteorologia Setmanal          [✕]      │   │  │
│  │ │    Institut Exemple · Bages                     │   │  │
│  │ │    1:45 · Meteorologia                          │   │  │
│  │ └─────────────────────────────────────────────────┘   │  │
│  │                                                         │  │
│  │ ... (2 vídeos més)                                     │  │
│  │                                                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                 │
│  💡 Arrossega els vídeos per canviar l'ordre                  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

**Funcionalitat del drag & drop:**
- **⋮⋮** icona indica que és arrossegable
- Hover mostra cursor `grab`
- Mentre s'arrossega: cursor `grabbing`, targeta semi-transparent
- Drop zone amb highlight blau
- Actualització immediata de la llista en guardar

---

### Modal: Afegir Vídeos

```
┌────────────────────────────────────────────────────────────┐
│  [X] Afegir vídeos a: Dilluns                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Cerca vídeos per afegir a la llista                      │
│                                                             │
│  ┌───────────────────────────────────────────────────┐    │
│  │ 🔍 Cerca per títol...                             │    │
│  └───────────────────────────────────────────────────┘    │
│                                                             │
│  Filtres:                                                  │
│  Zona: [Totes ▼]  Tipus: [Tots ▼]  Tags: [Selecciona...] │
│                                                             │
│  ┌───────────────────────────────────────────────────┐    │
│  │ ☐ [Thumbnail] Vídeo Matinal                       │    │
│  │   Institut Exemple · 2:34                         │    │
│  └───────────────────────────────────────────────────┘    │
│  ┌───────────────────────────────────────────────────┐    │
│  │ ☐ [Thumbnail] Notícies Catalanes                  │    │
│  │   Institut Exemple · 3:12                         │    │
│  └───────────────────────────────────────────────────┘    │
│  ... (més vídeos)                                          │
│                                                             │
│  Seleccionats: 3 vídeos                [Cancel·lar] [Afegir] │
└────────────────────────────────────────────────────────────┘
```

**Validació especial per llista Anuncis:**
```
Si playlist.kind === 'announcements':
  - Només mostrar vídeos amb type = 'announcement'
  - Filtrar automàticament
  - Missatge informatiu: "Aquesta llista només accepta vídeos de tipus Anunci"
```

---

## 🔧 Implementació Tècnica

### API Routes

#### `GET /api/playlists`
Obté totes les llistes del centre de l'usuari.

**Query parameters:**
```typescript
interface PlaylistsQuery {
  centerId?: string;    // Filtrar per centre (admin global)
  kind?: string;        // Filtrar per tipus
  includeGlobal?: boolean; // Incloure llistes globals disponibles
}
```

**Resposta:**
```json
{
  "playlists": [
    {
      "id": "uuid",
      "center_id": "uuid",
      "name": "Dilluns",
      "kind": "weekday",
      "is_deletable": false,
      "is_student_editable": false,
      "video_count": 5,
      "created_at": "2026-01-10T10:00:00Z",
      "updated_at": "2026-01-15T14:30:00Z"
    },
    {
      "id": "uuid",
      "center_id": "uuid",
      "name": "Nadal 2025",
      "kind": "custom",
      "is_deletable": true,
      "is_student_editable": true,
      "video_count": 8,
      "created_by_user_id": "uuid",
      "created_at": "2026-01-05T09:00:00Z"
    }
  ],
  "global_playlists": [
    {
      "id": "uuid",
      "center_id": null,
      "name": "Efemèrides Mundials",
      "kind": "global",
      "video_count": 25,
      "created_by_user_id": "uuid-admin"
    }
  ]
}
```

---

#### `GET /api/playlists/[id]`
Obté detalls d'una llista específica amb els seus vídeos.

**Resposta:**
```json
{
  "playlist": {
    "id": "uuid",
    "center_id": "uuid",
    "name": "Dilluns",
    "kind": "weekday",
    "is_deletable": false,
    "is_student_editable": false,
    "created_at": "2026-01-10T10:00:00Z"
  },
  "items": [
    {
      "id": "uuid",
      "position": 0,
      "video": {
        "id": "uuid",
        "title": "Vídeo Matinal",
        "thumbnail_url": "https://...",
        "duration_seconds": 154,
        "center": {
          "name": "Institut Exemple",
          "zone": { "name": "Bages" }
        },
        "tags": [
          { "name": "World" },
          { "name": "Catalunya" }
        ]
      },
      "added_at": "2026-01-12T11:00:00Z",
      "added_by_user_id": "uuid"
    }
  ]
}
```

---

#### `POST /api/playlists`
Crea una llista personalitzada.

**Body:**
```json
{
  "name": "Nadal 2025",
  "is_student_editable": true,
  "video_ids": ["uuid1", "uuid2", "uuid3"] // Opcional: afegir vídeos inicialment
}
```

**Validacions:**
- Nom no buit
- Usuari té permís per crear llistes (editor-profe o admin)
- Si s'afegeixen vídeos, han de ser accessibles per l'usuari

**Resposta:**
```json
{
  "playlist": { ... },
  "message": "Llista creada correctament"
}
```

---

#### `PATCH /api/playlists/[id]`
Actualitza metadades d'una llista.

**Body:**
```json
{
  "name": "Nadal 2025 - Actualitzat",
  "is_student_editable": false
}
```

**Validacions:**
- Usuari té permís per editar aquesta llista
- No es poden modificar camps `kind`, `is_deletable` de llistes predefinides

---

#### `DELETE /api/playlists/[id]`
Elimina una llista personalitzada.

**Validacions:**
- `is_deletable = true` (no es poden eliminar predefinides)
- Usuari té permís per eliminar
- Confirmació de l'usuari

**Efecte:** DELETE CASCADE elimina també tots els `playlist_items` associats.

---

#### `POST /api/playlists/[id]/videos`
Afegeix vídeos a una llista.

**Body:**
```json
{
  "video_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Lògica:**
1. Obtenir la `position` màxima actual de la llista
2. Afegir nous vídeos amb posicions incrementals (max_position + 1, max_position + 2, ...)
3. Si `playlist.kind === 'announcements'`: validar que tots els vídeos són `type = 'announcement'`

**Resposta:**
```json
{
  "added": 3,
  "message": "3 vídeos afegits correctament"
}
```

---

#### `DELETE /api/playlists/[id]/videos/[videoId]`
Elimina un vídeo d'una llista.

**Lògica:**
1. Eliminar el `playlist_item` corresponent
2. **Reordenar posicions** dels items restants per evitar gaps:
   ```sql
   -- Si eliminem position=2, els items 3,4,5 passen a 2,3,4
   UPDATE playlist_items
   SET position = position - 1
   WHERE playlist_id = ? AND position > deleted_position
   ```

---

#### `PATCH /api/playlists/[id]/reorder`
Reordena els vídeos d'una llista (després del drag & drop).

**Body:**
```json
{
  "items": [
    { "id": "item-uuid-1", "position": 0 },
    { "id": "item-uuid-2", "position": 1 },
    { "id": "item-uuid-3", "position": 2 }
  ]
}
```

**Lògica:**
- Actualitzar la posició de cada item en una transacció
- Validar que no hi ha duplicats de position
- Validar que totes les positions són consecutives (0, 1, 2, ...)

---

#### `POST /api/playlists/[id]/copy`
Crea una còpia local d'una llista global (només Admin).

**Body:**
```json
{
  "center_id": "uuid" // Centre destí
}
```

**Lògica:**
1. Crear nova playlist amb:
   - `center_id` = centre destí
   - `kind` = `custom` (ja no és global)
   - `origin_playlist_id` = ID de la llista global original
   - `name` = Nom original + " (Còpia)"
2. Copiar tots els `playlist_items` de l'original

---

## 🎨 Components React

### `PlaylistList.tsx`
Mostra el llistat de llistes amb filtres.

```typescript
'use client';

import { useState, useEffect } from 'react';
import PlaylistCard from './PlaylistCard';

export default function PlaylistList() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [filter, setFilter] = useState<'all' | 'weekday' | 'custom' | 'global'>('all');

  useEffect(() => {
    fetchPlaylists();
  }, [filter]);

  const fetchPlaylists = async () => {
    const res = await fetch(`/api/playlists?kind=${filter}&includeGlobal=true`);
    const data = await res.json();
    setPlaylists(data.playlists);
  };

  return (
    <div>
      {/* Filtres */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setFilter('all')}>Totes</button>
        <button onClick={() => setFilter('weekday')}>Predefinides</button>
        <button onClick={() => setFilter('custom')}>Personalitzades</button>
        <button onClick={() => setFilter('global')}>Globals</button>
      </div>

      {/* Llistat */}
      <div className="space-y-4">
        {playlists.map(playlist => (
          <PlaylistCard
            key={playlist.id}
            playlist={playlist}
            onEdit={(id) => router.push(`/llistes/${id}/editar`)}
            onDelete={playlist.is_deletable ? handleDelete : undefined}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### `PlaylistEditor.tsx`
Editor principal amb drag & drop.

```typescript
'use client';

import { useState, useEffect } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import DraggableVideoItem from './DraggableVideoItem';

interface PlaylistEditorProps {
  playlistId: string;
}

export default function PlaylistEditor({ playlistId }: PlaylistEditorProps) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [isAddingVideos, setIsAddingVideos] = useState(false);

  useEffect(() => {
    fetchPlaylistDetails();
  }, [playlistId]);

  const fetchPlaylistDetails = async () => {
    const res = await fetch(`/api/playlists/${playlistId}`);
    const data = await res.json();
    setPlaylist(data.playlist);
    setItems(data.items);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(item => item.id === active.id);
    const newIndex = items.findIndex(item => item.id === over.id);

    // Reordenar localment
    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);

    // Guardar al backend
    saveReorder(newItems);
  };

  const saveReorder = async (reorderedItems: PlaylistItem[]) => {
    const itemsWithPositions = reorderedItems.map((item, index) => ({
      id: item.id,
      position: index
    }));

    await fetch(`/api/playlists/${playlistId}/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: itemsWithPositions })
    });
  };

  const handleRemoveVideo = async (itemId: string, videoId: string) => {
    await fetch(`/api/playlists/${playlistId}/videos/${videoId}`, {
      method: 'DELETE'
    });

    // Actualitzar llista local
    setItems(items.filter(item => item.id !== itemId));
  };

  return (
    <div>
      <div className="flex justify-between mb-6">
        <h1>Editar Llista: {playlist?.name}</h1>
        <button onClick={() => setIsAddingVideos(true)}>
          🔍 Afegir vídeos
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Aquesta llista està buida. Afegeix vídeos per començar.
        </div>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item, index) => (
                <DraggableVideoItem
                  key={item.id}
                  item={item}
                  index={index}
                  onRemove={() => handleRemoveVideo(item.id, item.video.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {isAddingVideos && (
        <AddVideosModal
          playlistId={playlistId}
          playlistKind={playlist?.kind}
          onClose={() => setIsAddingVideos(false)}
          onVideosAdded={fetchPlaylistDetails}
        />
      )}
    </div>
  );
}
```

---

### `DraggableVideoItem.tsx`
Item arrossegable dins la llista.

```typescript
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DraggableVideoItemProps {
  item: PlaylistItem;
  index: number;
  onRemove: () => void;
}

export default function DraggableVideoItem({ item, index, onRemove }: DraggableVideoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 bg-white border rounded-lg"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        ⋮⋮
      </div>

      {/* Posició */}
      <span className="text-sm font-medium text-gray-500">
        {index + 1}.
      </span>

      {/* Thumbnail */}
      <img
        src={item.video.thumbnail_url}
        alt={item.video.title}
        className="w-24 h-14 object-cover rounded"
      />

      {/* Info */}
      <div className="flex-1">
        <h3 className="font-medium">{item.video.title}</h3>
        <p className="text-sm text-gray-500">
          {item.video.center.name} · {formatDuration(item.video.duration_seconds)}
        </p>
        <div className="flex gap-1 mt-1">
          {item.video.tags.map(tag => (
            <span key={tag.name} className="text-xs px-2 py-1 bg-gray-100 rounded">
              {tag.name}
            </span>
          ))}
        </div>
      </div>

      {/* Botó eliminar */}
      <button
        onClick={onRemove}
        className="text-red-600 hover:text-red-800"
        title="Eliminar de la llista"
      >
        ✕
      </button>
    </div>
  );
}
```

---

### `AddVideosModal.tsx`
Modal per afegir vídeos a una llista.

```typescript
'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';

interface AddVideosModalProps {
  playlistId: string;
  playlistKind: string;
  onClose: () => void;
  onVideosAdded: () => void;
}

export default function AddVideosModal({
  playlistId,
  playlistKind,
  onClose,
  onVideosAdded
}: AddVideosModalProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({ search: '', type: 'all' });

  useEffect(() => {
    fetchAvailableVideos();
  }, [filters]);

  const fetchAvailableVideos = async () => {
    const params = new URLSearchParams({
      search: filters.search,
      status: 'published', // Només vídeos publicats
      // Si és llista Anuncis, filtrar només announcements
      ...(playlistKind === 'announcements' && { type: 'announcement' })
    });

    const res = await fetch(`/api/videos?${params}`);
    const data = await res.json();
    setVideos(data.videos);
  };

  const handleToggleVideo = (videoId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId);
    } else {
      newSelected.add(videoId);
    }
    setSelectedIds(newSelected);
  };

  const handleAddVideos = async () => {
    if (selectedIds.size === 0) return;

    await fetch(`/api/playlists/${playlistId}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_ids: Array.from(selectedIds) })
    });

    onVideosAdded();
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} size="large">
      <h2 className="text-xl font-bold mb-4">Afegir vídeos a la llista</h2>

      {playlistKind === 'announcements' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          ℹ️ Aquesta llista només accepta vídeos de tipus Anunci
        </div>
      )}

      {/* Cerca */}
      <input
        type="text"
        placeholder="🔍 Cerca per títol..."
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        className="w-full mb-4 px-4 py-2 border rounded"
      />

      {/* Llistat de vídeos */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {videos.map(video => (
          <label
            key={video.id}
            className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(video.id)}
              onChange={() => handleToggleVideo(video.id)}
            />
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-20 h-12 object-cover rounded"
            />
            <div className="flex-1">
              <p className="font-medium">{video.title}</p>
              <p className="text-sm text-gray-500">
                {video.center.name} · {formatDuration(video.duration_seconds)}
              </p>
            </div>
          </label>
        ))}
      </div>

      {/* Botons */}
      <div className="flex justify-between mt-6">
        <span className="text-sm text-gray-600">
          Seleccionats: {selectedIds.size} vídeos
        </span>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel·lar
          </button>
          <button
            onClick={handleAddVideos}
            disabled={selectedIds.size === 0}
            className="btn-primary"
          >
            Afegir
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

---

## 🔐 Permisos per Rol

### Editor-profe
```typescript
// Permisos del editor-profe
{
  // Llistes
  viewPlaylists: true,        // Veure totes les llistes del centre
  createPlaylist: true,        // Crear llistes personalitzades
  editPlaylist: true,          // Editar qualsevol llista del centre
  deletePlaylist: (playlist) => playlist.is_deletable, // Només personalitzades

  // Items de llistes
  addVideosToPlaylist: true,   // Afegir vídeos
  removeVideosFromPlaylist: true, // Eliminar vídeos
  reorderPlaylist: true,       // Reordenar amb drag & drop

  // Llistes globals
  viewGlobalPlaylists: true,   // Veure llistes globals disponibles
  copyGlobalPlaylist: false    // NO pot copiar (només admin)
}
```

### Editor-alumne
```typescript
// Permisos del editor-alumne
{
  // Llistes
  viewPlaylists: true,         // Veure totes les llistes del centre
  createPlaylist: false,       // NO pot crear llistes
  editPlaylist: false,         // NO pot editar metadades
  deletePlaylist: false,       // NO pot eliminar llistes

  // Items de llistes (segons is_student_editable)
  addVideosToPlaylist: (playlist) => playlist.is_student_editable,
  removeVideosFromPlaylist: (playlist) => playlist.is_student_editable,
  reorderPlaylist: (playlist) => playlist.is_student_editable,

  // Llistes globals
  viewGlobalPlaylists: false,  // NO veu llistes globals
  copyGlobalPlaylist: false
}
```

### Admin Global
```typescript
// Permisos del admin global
{
  // Llistes
  viewPlaylists: true,         // Veure llistes de TOTS els centres
  createPlaylist: true,        // Crear llistes personalitzades
  editPlaylist: true,          // Editar qualsevol llista
  deletePlaylist: (playlist) => playlist.is_deletable,

  // Items
  addVideosToPlaylist: true,
  removeVideosFromPlaylist: true,
  reorderPlaylist: true,

  // Llistes globals
  viewGlobalPlaylists: true,
  createGlobalPlaylist: true,  // Crear llistes globals (center_id = NULL)
  copyGlobalPlaylist: true     // Copiar llista global a un centre específic
}
```

---

## 📦 Llibreries Necessàries

### @dnd-kit (Drag & Drop)

**Instal·lació:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Per què @dnd-kit i no react-beautiful-dnd?**
- `react-beautiful-dnd` està deprecated i no suporta React 19
- `@dnd-kit` és més modern, lleuger i flexible
- Millor suport per accessibilitat (teclat)
- Més performant amb llistes grans

**Exemple d'ús bàsic:**
```typescript
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';

<DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
    {items.map(item => (
      <SortableItem key={item.id} item={item} />
    ))}
  </SortableContext>
</DndContext>
```

---

## 📋 Tasques d'Implementació

### Fase 1: Setup i API Routes (2 dies)

**1. API Routes**
- [ ] `GET /api/playlists` - Llistar llistes
- [ ] `GET /api/playlists/[id]` - Detalls de llista
- [ ] `POST /api/playlists` - Crear llista personalitzada
- [ ] `PATCH /api/playlists/[id]` - Actualitzar metadades
- [ ] `DELETE /api/playlists/[id]` - Eliminar llista
- [ ] `POST /api/playlists/[id]/videos` - Afegir vídeos
- [ ] `DELETE /api/playlists/[id]/videos/[videoId]` - Eliminar vídeo
- [ ] `PATCH /api/playlists/[id]/reorder` - Reordenar items
- [ ] `POST /api/playlists/[id]/copy` - Copiar llista global (admin)

**2. Validacions**
- [ ] Validar permisos per cada operació
- [ ] Validar tipus de vídeo per llista Anuncis
- [ ] Validar `is_deletable` abans d'eliminar
- [ ] Validar posicions consecutives en reorder

### Fase 2: Components Base (2 dies)

**3. Components de Visualització**
- [ ] `PlaylistList.tsx` - Llistat principal
- [ ] `PlaylistCard.tsx` - Targeta de llista
- [ ] `PlaylistFilters.tsx` - Filtres (predefinides/custom/global)

**4. Components d'Edició**
- [ ] `PlaylistEditor.tsx` - Editor principal amb drag & drop
- [ ] `DraggableVideoItem.tsx` - Item arrossegable
- [ ] `AddVideosModal.tsx` - Modal per afegir vídeos

**5. Formularis**
- [ ] `PlaylistForm.tsx` - Crear/editar llista personalitzada
- [ ] `PlaylistSettings.tsx` - Configuració (is_student_editable)

### Fase 3: Drag & Drop (2 dies)

**6. Integració @dnd-kit**
- [ ] Instal·lar @dnd-kit (core, sortable, utilities)
- [ ] Context DnD al PlaylistEditor
- [ ] Sortable items amb handles visuals
- [ ] Feedback visual durant drag (opacity, cursor)
- [ ] Drop zones amb highlights

**7. Reordenació**
- [ ] Actualització local optimista de la llista
- [ ] Guardar al backend amb debounce
- [ ] Gestió d'errors (rollback si falla)
- [ ] Indicador de "Guardant..." mentre actualitza

### Fase 4: Funcionalitats Avançades (2 dies)

**8. Llistes Globals (Admin)**
- [ ] Vista de llistes globals disponibles
- [ ] Botó "Copiar a centre" per admin
- [ ] Indicador visual de llista global vs. local
- [ ] Modal per seleccionar centre destí

**9. Permisos Editor-alumne**
- [ ] Comprovar `is_student_editable` abans de permetre edició
- [ ] Ocultar botons Crear/Eliminar per alumnes
- [ ] Missatge informatiu quan no pot editar una llista

**10. Validació Llista Anuncis**
- [ ] Filtrar només vídeos `type = 'announcement'` al modal
- [ ] Validació backend al afegir vídeos
- [ ] Missatge d'error clar si intent incorrecte

### Fase 5: UX i Poliment (1 dia)

**11. Loading States**
- [ ] Skeleton loaders per llistes
- [ ] Loading spinner durant reorder
- [ ] Indicador de vídeos afegint-se

**12. Empty States**
- [ ] Llista buida: missatge + botó "Afegir vídeos"
- [ ] Cap llista personalitzada: missatge + botó "Crear llista"

**13. Feedback Visual**
- [ ] Toast notifications (llista creada, vídeos afegits, etc.)
- [ ] Confirmació abans d'eliminar llista
- [ ] Confirmació abans d'eliminar vídeo de llista

### Fase 6: Testing (1 dia)

**14. Tests Funcionals**
- [ ] Crear llista personalitzada
- [ ] Afegir vídeos a llista
- [ ] Reordenar vídeos amb drag & drop
- [ ] Eliminar vídeo de llista
- [ ] Eliminar llista personalitzada
- [ ] Validar que NO es pot eliminar llista predefinida
- [ ] Validar restricció de llista Anuncis

**15. Tests de Permisos**
- [ ] Editor-profe pot fer totes les operacions
- [ ] Editor-alumne pot editar llistes amb `is_student_editable = true`
- [ ] Editor-alumne NO pot editar llistes amb `is_student_editable = false`
- [ ] Editor-alumne NO pot crear ni eliminar llistes
- [ ] Admin global pot crear llistes globals
- [ ] Admin global pot copiar llista global a centres

**16. Tests de Validació**
- [ ] Llista Anuncis només accepta vídeos `type = 'announcement'`
- [ ] Reordenació manté posicions consecutives (0, 1, 2, ...)
- [ ] No es poden eliminar llistes predefinides
- [ ] Validació de permisos a totes les API routes

---

## 🧪 Casos de Test

### Test 1: Crear llista personalitzada
```
1. Login com Editor-profe
2. Accedir /llistes
3. Clic "Nova Llista"
4. Omplir formulari:
   - Nom: "Setmana de la Ciència"
   - Checkbox: ☑ Editable per alumnes
5. Guardar
6. ✅ Verificar: Llista apareix al llistat
7. ✅ Verificar: kind = 'custom', is_deletable = true
```

### Test 2: Afegir vídeos amb drag & drop
```
1. Login com Editor-profe
2. Accedir /llistes/[id-dilluns]/editar
3. Clic "Afegir vídeos"
4. Seleccionar 3 vídeos
5. Clic "Afegir"
6. ✅ Verificar: 3 vídeos apareixen ordenats (position: 0, 1, 2)
7. Arrossegar vídeo de position 2 a position 0
8. ✅ Verificar: Ordre actualitzat (2→0, 0→1, 1→2)
9. Guardar
10. ✅ Verificar BD: positions correctes
```

### Test 3: Restricció llista Anuncis
```
1. Login com Editor-profe
2. Accedir /llistes/[id-anuncis]/editar
3. Clic "Afegir vídeos"
4. ✅ Verificar: Només vídeos type='announcement' visibles
5. Intentar afegir vídeo type='content' manualment (via API)
6. ✅ Verificar: Error 400 "Aquesta llista només accepta Anuncis"
```

### Test 4: Permisos Editor-alumne
```
1. Login com Editor-alumne
2. Accedir /llistes
3. ✅ Verificar: Veu totes les llistes
4. ✅ Verificar: NO veu botó "Nova Llista"
5. Accedir llista amb is_student_editable = true
6. ✅ Verificar: Pot afegir/eliminar/reordenar vídeos
7. Accedir llista amb is_student_editable = false
8. ✅ Verificar: Només lectura, sense botons d'edició
```

### Test 5: Llistes globals (Admin)
```
1. Login com Admin Global
2. Crear llista global "Efemèrides Mundials"
3. ✅ Verificar: center_id = NULL, kind = 'global'
4. Login com Editor-profe (centre diferent)
5. Accedir /llistes
6. ✅ Verificar: Veu llista global a "Disponibles"
7. (Futur) Clic "Copiar"
8. ✅ Verificar: Còpia local creada amb origin_playlist_id
```

---

## ⚠️ Riscos i Mitigacions

| Risc | Probabilitat | Impacte | Mitigació |
|------|--------------|---------|-----------|
| **Drag & drop lent amb molts items** | 🟡 Mitjana | 🟢 Baix | Virtualització si >100 items, lazy loading |
| **Posicions duplicades en race condition** | 🟢 Baixa | 🟡 Mitjà | Transaccions SQL, UNIQUE constraint |
| **Reordenació confusa per l'usuari** | 🟢 Baixa | 🟡 Mitjà | Feedback visual clar, animacions suaus |
| **Llistes globals mal gestionades** | 🟢 Baixa | 🟡 Mitjà | Només admin pot crear, documentació clara |
| **RLS policies incorrectes** | 🟡 Mitjana | 🔴 Alt | Tests exhaustius per cada rol |

---

## 📊 Mètriques d'Èxit

### Funcionals
- ✅ 8 llistes predefinides creades automàticament per cada centre
- ✅ Drag & drop funciona amb <100ms de latència
- ✅ Validació llista Anuncis 100% efectiva
- ✅ 0 errors de posicions duplicades

### UX
- ✅ Temps càrrega pàgina llistes <1s
- ✅ Feedback visual immediat en totes les accions
- ✅ Suport per teclat (accessibilitat)

### Integració
- ✅ Preparat per M6: API `/api/playlists/[id]` retorna llista ordenada
- ✅ Compatible amb futur sistema de programació (M7: calendari)

---

## 🚀 Pròxims Passos (Post-M4)

Un cop completat M4, el següent milestone serà **M5: Sistema RSS**, que implementarà feeds externs per mostrar notícies a la pantalla principal.

**Prerequisit de M4 per M6:**
- M6 necessita playlists funcionals per reproduir vídeos segons el dia/context
- Llista "Anuncis" serà fonamental per la zona d'anuncis de M6

---

## 📚 Referències

- [dnd-kit Documentation](https://docs.dndkit.com/)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

**Data de creació:** 19 gener 2026
**Estat:** Planificat, pendent implementació
**Responsable:** Equip de desenvolupament
**Prioritat:** Alta (bloqueador per M6 - Pantalla Principal)
