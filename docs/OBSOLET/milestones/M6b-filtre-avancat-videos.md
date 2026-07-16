# Milestone 6b: Filtre Avançat de Vídeos

**Objectiu:** Drawer lateral de filtres per tags globals, hashtags del centre i zona, reutilitzable a `/contingut` i al modal `AddVideosModal`.

**Durada estimada:** 1 setmana
**Dependències:** M3a completat (tags, hashtags, filtres bàsics), M4 completat (AddVideosModal)
**Risc:** 🟢 Baix (funcionalitat UI sense canvis de schema)
**Estat:** PENDENT

---

## 📋 Context

### Estat actual dels filtres

**Què ja funciona:**
- `/contingut` té filtres a la part superior: cerca per títol, tipus (content/announcement), estat (published/pending), checkbox "Incloure compartits"
- `useVideos` hook (`hooks/useVideos.ts`) ja defineix `tagIds: string[]` i `hashtagIds: string[]` al `FilterState` (línies 10-11) — inicialitzats com arrays buits
- `GET /api/videos` (`app/api/videos/route.ts`) ja accepta paràmetres `tagIds` i `hashtagIds` (CSV) i filtra client-side (línies 158-171)
- `TagSelector` (`app/components/videos/TagSelector.tsx`) existeix per seleccionar tags a la creació/edició de vídeos
- `HashtagInput` (`app/components/videos/HashtagInput.tsx`) existeix per introduir hashtags a la creació/edició
- L'API accepta `zoneId` com a paràmetre de filtre, però no hi ha cap selector de zona a la UI

**Què falta:**
- No hi ha cap UI per filtrar vídeos per tags globals
- No hi ha cap UI per filtrar vídeos per hashtags del centre
- No hi ha cap selector de zona a `/contingut`
- `AddVideosModal` (`app/components/playlists/AddVideosModal.tsx`) només té cerca per títol, sense cap filtre addicional

### Decisió de disseny

En lloc d'afegir més filtres inline a la part superior (que ja està plena), s'implementarà un **drawer lateral dret** que es desplega amb un botó "Filtres". Això permet:
- Escalar el nombre de filtres sense ocupar espai permanent
- Reutilitzar el mateix component a `/contingut` i `AddVideosModal`
- Mostrar un comptador de filtres actius al botó

---

## 🎯 Criteris d'Acceptació

### Component FilterDrawer
- [ ] Drawer es desplega des de la dreta amb animació
- [ ] Es tanca amb botó X, clic fora o tecla Escape
- [ ] Mostra comptador de filtres actius al botó d'obertura (badge numèric)
- [ ] Botó "Netejar filtres" reinicialitza tots els camps
- [ ] Aplica filtres en temps real (sense botó "Aplicar")

### Filtres disponibles al Drawer
- [ ] **Tags globals** — Selector múltiple amb botons/chips (reutilitza estil de `TagSelector`)
- [ ] **Hashtags del centre** — Selector múltiple amb botons/chips (carrega hashtags existents del centre)
- [ ] **Zona** — Selector dropdown amb les zones actives
- [ ] Cada secció mostra el nombre d'opcions seleccionades

### Integració a `/contingut`
- [ ] Botó "Filtres" visible al costat dels filtres existents
- [ ] Badge amb comptador de filtres actius (tags + hashtags + zona)
- [ ] Filtres del drawer es combinen amb els filtres existents (cerca, tipus, estat, compartits)
- [ ] Filtres persisteixen com a URL params (`?tags=id1,id2&hashtags=id3&zone=id4`)
- [ ] Canvi de filtres reinicia paginació a pàgina 1

### Integració a AddVideosModal
- [ ] Botó "Filtres" al costat del camp de cerca existent
- [ ] Mateix drawer amb els mateixos filtres
- [ ] Respecta restriccions existents (llista Anuncis filtra per `type = announcement`)
- [ ] Comptador de filtres actius visible

### API
- [ ] Verificar que `GET /api/videos` filtra correctament per `tagIds` i `hashtagIds`
- [ ] Millorar filtratge: moure de client-side a server-side (query SQL amb joins) per eficiència
- [ ] Afegir `zoneId` al llistat de paràmetres documentats

### Permisos
- [ ] Tots els rols poden utilitzar els filtres (lectura)
- [ ] Hashtags mostrats són només els del centre de l'usuari
- [ ] Admin global veu hashtags del centre seleccionat

---

## 🏗️ Arquitectura

### Components nous

```
app/components/videos/
├── FilterDrawer.tsx          # Drawer lateral reutilitzable
├── TagFilterSelector.tsx     # Multi-select de tags globals (mode filtre)
├── HashtagFilterSelector.tsx # Multi-select de hashtags del centre (mode filtre)
└── ZoneSelector.tsx          # Dropdown de zones
```

### Hook nou

```
hooks/
└── useVideoFilters.ts        # Gestió d'estat dels filtres avançats
```

### Fitxers a modificar

```
app/contingut/page.tsx                     # Afegir botó + integrar FilterDrawer
app/components/playlists/AddVideosModal.tsx # Afegir botó + integrar FilterDrawer
app/api/videos/route.ts                    # Millorar filtratge server-side
hooks/useVideos.ts                         # Afegir zoneId al FilterState
```

---

## 📊 Detall d'Implementació

### 1. Component `FilterDrawer`

**Props:**
```typescript
interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  // Filtres actuals
  selectedTagIds: string[];
  selectedHashtagIds: string[];
  selectedZoneId: string | null;
  // Callbacks
  onTagsChange: (tagIds: string[]) => void;
  onHashtagsChange: (hashtagIds: string[]) => void;
  onZoneChange: (zoneId: string | null) => void;
  onClearAll: () => void;
  // Context
  centerId: string | null;       // Per carregar hashtags del centre
  hideZoneFilter?: boolean;      // Per ocultar si no cal
}
```

**Comportament:**
- Overlay semi-transparent amb backdrop-blur
- Panel de 320px d'amplada des de la dreta
- Scroll intern si el contingut és més alt que la pantalla
- Transició: `translate-x` amb `duration-300`
- Z-index alt (z-40) per quedar sobre el contingut
- Tanca amb clic a l'overlay o botó X

**Estructura visual:**
```
┌──────────────────────────────────┐
│  Filtres                    [X]  │
├──────────────────────────────────┤
│                                  │
│  Etiquetes (3 seleccionades)     │
│  ┌──────┐ ┌──────┐ ┌──────┐     │
│  │ Tag1 │ │ Tag2 │ │ Tag3 │     │
│  └──────┘ └──────┘ └──────┘     │
│  ┌──────┐ ┌──────┐              │
│  │ Tag4 │ │ Tag5 │              │
│  └──────┘ └──────┘              │
│                                  │
│  Hashtags (1 seleccionat)        │
│  ┌────────┐ ┌────────┐          │
│  │ #hash1 │ │ #hash2 │          │
│  └────────┘ └────────┘          │
│  ┌────────┐                     │
│  │ #hash3 │                     │
│  └────────┘                     │
│                                  │
│  Zona                            │
│  ┌──────────────────────── ▼ ┐   │
│  │ Totes les zones            │  │
│  └────────────────────────────┘  │
│                                  │
├──────────────────────────────────┤
│  [ Netejar filtres ]             │
└──────────────────────────────────┘
```

---

### 2. Component `TagFilterSelector`

Diferent del `TagSelector` existent (que és per creació de vídeos amb validació mínim 1). Aquest és per filtratge:

**Props:**
```typescript
interface TagFilterSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}
```

**Comportament:**
- Carrega tots els tags actius de `GET /api/tags`
- Botons/chips toggle (clic per seleccionar/desseleccionar)
- Sense restricció de mínim (0 tags = sense filtre)
- Estil seleccionat: fons groc `#FEDD2C` amb text negre (estil corporatiu)
- Estil no seleccionat: fons gris clar amb vora
- Grid responsive dins del drawer

---

### 3. Component `HashtagFilterSelector`

**Props:**
```typescript
interface HashtagFilterSelectorProps {
  centerId: string | null;
  selectedHashtagIds: string[];
  onChange: (hashtagIds: string[]) => void;
}
```

**Comportament:**
- Carrega hashtags del centre: `GET /api/hashtags?centerId=X`
- Mateixa mecànica toggle que `TagFilterSelector`
- Si no hi ha hashtags al centre, mostra missatge "No hi ha hashtags"
- Prefix `#` visual a cada chip
- Es necessita una nova API route si no existeix (verificar)

**API necessària:**
```
GET /api/hashtags?centerId=uuid
→ { hashtags: [{ id, name, center_id }] }
```

---

### 4. Component `ZoneSelector`

**Props:**
```typescript
interface ZoneSelectorProps {
  selectedZoneId: string | null;
  onChange: (zoneId: string | null) => void;
}
```

**Comportament:**
- Dropdown/select amb les zones actives
- Primera opció: "Totes les zones" (value = null)
- Carrega zones de `GET /api/zones` o similar (verificar API existent)

---

### 5. Hook `useVideoFilters`

Gestiona l'estat dels filtres avançats i la sincronització amb URL params.

```typescript
interface UseVideoFiltersReturn {
  // Estat
  selectedTagIds: string[];
  selectedHashtagIds: string[];
  selectedZoneId: string | null;
  activeFilterCount: number;
  // Accions
  setTagIds: (ids: string[]) => void;
  setHashtagIds: (ids: string[]) => void;
  setZoneId: (id: string | null) => void;
  clearAll: () => void;
  // Drawer
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}
```

**Comportament:**
- `activeFilterCount` = nombre total de filtres seleccionats (tags + hashtags + zona)
- A `/contingut`: sincronitza amb URL params (`?tags=id1,id2&hashtags=id3&zone=id4`)
- A `AddVideosModal`: estat local (no URL params)

---

### 6. Millora API: Filtratge server-side

**Problema actual:** `GET /api/videos` filtra tags i hashtags **client-side** (línies 158-171 de `route.ts`). Això és ineficient amb molts vídeos.

**Solució:** Moure el filtratge a la query SQL amb joins.

**Filtratge per tags (SQL conceptual):**
```sql
-- Si tagIds = ['id1', 'id2'] (lògica AND: vídeo ha de tenir TOTS els tags)
SELECT DISTINCT v.*
FROM videos v
WHERE v.id IN (
  SELECT vt.video_id
  FROM video_tags vt
  WHERE vt.tag_id IN ('id1', 'id2')
  GROUP BY vt.video_id
  HAVING COUNT(DISTINCT vt.tag_id) = 2  -- nombre de tags seleccionats
)
```

**Amb Supabase JS:**
La limitació de Supabase JS és que no suporta fàcilment subqueries amb HAVING. Opcions:

**Opció A — RPC (funció SQL):**
Crear una funció `filter_videos_by_tags(tag_ids uuid[])` que retorni video_ids filtrats.

**Opció B — Filtratge progressiu client-side (mantenir actual):**
Mantenir el filtratge client-side però augmentar el `limit` de la query inicial per evitar pèrdua de resultats. Afegir un avís si els resultats poden estar truncats.

**Recomanació:** Opció B per ara (simplicitat), amb TODO per migrar a Opció A si el rendiment és un problema amb +500 vídeos.

---

### 7. Integració a `/contingut`

**Canvis a `app/contingut/page.tsx`:**

Afegir al costat dels filtres existents:

```tsx
{/* Botó Filtres avançats */}
<button onClick={openDrawer} className="...">
  <FunnelIcon className="h-5 w-5" />
  Filtres
  {activeFilterCount > 0 && (
    <span className="badge">{activeFilterCount}</span>
  )}
</button>

{/* Drawer */}
<FilterDrawer
  isOpen={isDrawerOpen}
  onClose={closeDrawer}
  selectedTagIds={filters.tagIds}
  selectedHashtagIds={filters.hashtagIds}
  selectedZoneId={filters.zoneId}
  onTagsChange={(ids) => updateFilters({ tagIds: ids })}
  onHashtagsChange={(ids) => updateFilters({ hashtagIds: ids })}
  onZoneChange={(id) => updateFilters({ zoneId: id })}
  onClearAll={clearAdvancedFilters}
  centerId={userCenterId}
/>
```

**URL params:** Quan l'usuari selecciona filtres, actualitzar la URL:
```
/contingut?type=content&tags=uuid1,uuid2&hashtags=uuid3&zone=uuid4
```

---

### 8. Integració a `AddVideosModal`

**Canvis a `app/components/playlists/AddVideosModal.tsx`:**

Afegir al costat del camp de cerca:

```tsx
<div className="flex gap-2">
  <input placeholder="Cerca per títol..." ... />
  <button onClick={openDrawer} className="...">
    <FunnelIcon />
    {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
  </button>
</div>
```

**Canvis al fetch de vídeos:**
Modificar la URL del fetch per incloure els filtres avançats:
```typescript
const params = new URLSearchParams({
  centerId: centerId || '',
  status: 'published',
  includeShared: 'true',
  limit: '100',
});
if (tagIds.length) params.set('tagIds', tagIds.join(','));
if (hashtagIds.length) params.set('hashtagIds', hashtagIds.join(','));
if (zoneId) params.set('zoneId', zoneId);
```

---

## 📐 Disseny Visual

### Colors dels filtres (coherent amb guia d'estil)
- **Tag seleccionat:** fons `#FEDD2C` (groc corporatiu), text `#111827`
- **Tag no seleccionat:** fons `#F3F4F6`, vora `#D1D5DB`, text `#374151`
- **Hashtag seleccionat:** fons `#16AFAA` (cyan accent), text blanc
- **Hashtag no seleccionat:** fons `#F3F4F6`, vora `#D1D5DB`, text `#374151`
- **Botó Filtres actiu:** vora `#FEDD2C`, badge fons `#F91248` (rosa accent) amb text blanc
- **Botó "Netejar filtres":** text `#F91248`, sense fons

### Mida dels chips
- Padding: `px-3 py-1.5`
- Font: `text-sm font-medium`
- Border-radius: `rounded-full`
- Transició: `transition-colors duration-150`

---

## 🔗 Dependències Externes

Cap nova dependència. Tot s'implementa amb:
- React (useState, useCallback, useEffect)
- Tailwind CSS (animacions, transicions)
- Next.js (useSearchParams, useRouter per URL sync)

---

## 📋 Tasques Ordenades

### Fase 1: Components base
1. Crear `TagFilterSelector` — adaptar `TagSelector` per mode filtratge
2. Crear `HashtagFilterSelector` — nou component amb fetch de hashtags del centre
3. Crear `ZoneSelector` — dropdown de zones
4. Crear API route `GET /api/hashtags` si no existeix
5. Verificar API route zones (`GET /api/zones` o similar)

### Fase 2: Drawer i hook
6. Crear `FilterDrawer` — drawer lateral amb els 3 selectors
7. Crear `useVideoFilters` hook — estat + comptador + URL sync

### Fase 3: Integració
8. Integrar `FilterDrawer` a `/contingut` — botó + drawer + connectar amb `useVideos`
9. Afegir `zoneId` al `FilterState` de `useVideos` i passar-lo a l'API
10. Integrar `FilterDrawer` a `AddVideosModal` — botó + drawer + connectar amb fetch

### Fase 4: Verificació
11. Verificar filtratge API amb combinació de tags + hashtags + zona + tipus + cerca
12. Testejar amb cada rol (admin_global, editor_profe, editor_alumne)
13. Verificar URL params persisteixen i es carreguen correctament a `/contingut`

---

## ⚠️ Consideracions

1. **Performance:** El filtratge actual de tags/hashtags és client-side. Amb <500 vídeos no serà un problema. Afegir TODO per migrar a server-side si escala.

2. **Hashtags buits:** Si un centre no té hashtags, la secció es mostra amb "No hi ha hashtags al centre" i s'amaga el selector.

3. **Responsive:** El drawer ha de funcionar bé en pantalles petites (amplada completa en mòbil, 320px en desktop).

4. **AddVideosModal:** El drawer s'obre "sobre" el modal. Cal gestionar z-index correctament (drawer z-50, modal z-40).

5. **Lògica de filtre tags:** OR (un vídeo que tingui ALMENYS un dels tags seleccionats). Això ja és el comportament actual de l'API (línia 160 de `route.ts` usa `.some()`).
