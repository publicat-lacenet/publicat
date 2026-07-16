# Milestone 5: Sistema RSS

**Objectiu:** Sistema complet de gestió de feeds RSS amb validació, caché, rotació automàtica i configuració per centre.

**Durada estimada:** 1.5 setmanes
**Dependències:** M4 completat (sistema de llistes de reproducció)
**Risc:** 🟡 Mitjà (RSS parsing pot fallar amb feeds malformats)
**Estat:** PENDENT

---

## 📋 Objectiu

Implementar un sistema de feeds RSS que permeti als centres:

1. **Afegir i gestionar feeds RSS** externs (notícies, actualitat, etc.)
2. **Validar feeds** abans de guardar-los (comprovar URL, format, contingut)
3. **Emmagatzemar en caché** els ítems dels feeds per evitar peticions constants
4. **Configurar paràmetres de visualització** (temps per ítem, temps per feed)
5. **Ordenar la rotació** dels feeds per personalitzar la visualització

Aquest sistema és **fonamental per M6 (Pantalla Principal)**, on els feeds RSS es mostraran a la zona inferior dreta.

---

## 🎯 Criteris d'Acceptació

### Funcionalitat Bàsica
- [ ] Editor-profe pot veure tots els feeds RSS del seu centre
- [ ] Editor-profe pot crear feeds RSS amb validació en temps real
- [ ] Editor-profe pot editar feeds existents (nom, URL)
- [ ] Editor-profe pot activar/desactivar feeds individualment
- [ ] Editor-profe pot eliminar feeds
- [ ] Admin global pot gestionar feeds de qualsevol centre

### Validació de Feeds
- [ ] Validació d'URL vàlida (format correcte)
- [ ] Validació que l'URL retorna un feed RSS/Atom vàlid
- [ ] Validació que el feed conté almenys 1 ítem
- [ ] Preview dels 3 primers ítems abans de guardar
- [ ] Missatges d'error clars si la validació falla

### Sistema de Caché
- [ ] Taula `rss_items` emmagatzema ítems de cada feed
- [ ] Cron job actualitza feeds periòdicament (cada 15-30 minuts)
- [ ] Control d'errors consecutius (desactivar després de 5 errors)
- [ ] Registre de l'última actualització i errors

### Configuració per Centre
- [ ] Durada per ítem configurable (per defecte 15 segons)
- [ ] Durada per feed configurable (per defecte 120 segons)
- [ ] Interval d'actualització configurable (per defecte 60 minuts)

### Ordre de Rotació
- [ ] Drag & drop per reordenar feeds a la rotació
- [ ] Incloure/excloure feeds de la rotació
- [ ] Guardar posicions persistentment

### Permisos
- [ ] Editor-alumne NO pot gestionar feeds RSS
- [ ] Editor-profe pot gestionar feeds del seu centre
- [ ] Admin global pot gestionar feeds de qualsevol centre
- [ ] Display pot llegir feeds per mostrar-los

---

## 📊 Estructura de Dades

### Taula `rss_feeds`

| Camp | Tipus | Descripció |
|------|-------|------------|
| `id` | uuid | Identificador únic |
| `center_id` | uuid (nullable) | Centre propietari (NULL = feed global) |
| `name` | text | Nom descriptiu del feed |
| `url` | text | URL del feed RSS/Atom |
| `is_active` | boolean | Si el feed està actiu |
| `is_in_rotation` | boolean | Si s'inclou a la rotació de pantalla |
| `last_fetched_at` | timestamptz | Última vegada que s'ha actualitzat |
| `last_error` | text | Últim error (si n'hi ha) |
| `error_count` | int | Comptador d'errors consecutius |
| `created_by_user_id` | uuid | Usuari creador |
| `created_at` | timestamptz | Data de creació |
| `updated_at` | timestamptz | Última actualització |

### Taula `rss_items`

| Camp | Tipus | Descripció |
|------|-------|------------|
| `id` | uuid | Identificador únic |
| `feed_id` | uuid | FK → rss_feeds(id) |
| `guid` | text | Identificador únic de l'ítem (del feed) |
| `title` | text | Títol de la notícia |
| `description` | text | Descripció/resum |
| `link` | text | Enllaç a la notícia original |
| `pub_date` | timestamptz | Data de publicació |
| `image_url` | text | URL de la imatge (si n'hi ha) |
| `fetched_at` | timestamptz | Quan s'ha obtingut |

**Constraint UNIQUE:** `(feed_id, guid)` - Evita duplicats d'ítems.

### Taula `rss_center_settings`

| Camp | Tipus | Descripció |
|------|-------|------------|
| `center_id` | uuid | PK + FK → centers(id) |
| `seconds_per_item` | int | Segons per mostrar cada ítem (default: 15) |
| `seconds_per_feed` | int | Segons per cada feed abans de rotar (default: 120) |
| `refresh_minutes` | int | Minuts entre actualitzacions (default: 60) |
| `updated_at` | timestamptz | Última actualització |

### Taula `rss_rotation_order`

| Camp | Tipus | Descripció |
|------|-------|------------|
| `center_id` | uuid | FK → centers(id) |
| `feed_id` | uuid | FK → rss_feeds(id) |
| `position` | int | Posició en la rotació (0-indexed) |

**PK:** `(center_id, feed_id)`
**Constraint UNIQUE:** `(center_id, position)` - Una sola posició per feed.

---

## 🔄 Workflow de Gestió de Feeds

### Flux de Creació de Feed

```
┌────────────────────────────────────────────────────────────┐
│  Editor-profe accedeix a /rss                               │
│  Clic "Afegir Feed"                                         │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│  Formulari de creació:                                      │
│  - Nom del feed (obligatori)                               │
│  - URL del feed (obligatori)                               │
│  - Checkbox: Incloure a la rotació (default: true)         │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│  Validació en temps real (al introduir URL):               │
│  1. Comprovar format URL vàlid                             │
│  2. Fetch del feed amb timeout (10s)                       │
│  3. Parser RSS/Atom                                         │
│  4. Verificar que conté ítems                              │
└───────────────────────┬────────────────────────────────────┘
                        │
           ┌────────────┴────────────┐
           │                         │
           ▼ (Èxit)                  ▼ (Error)
┌─────────────────────────┐  ┌────────────────────────────┐
│  Preview dels 3 primers │  │  Missatge d'error:          │
│  ítems del feed:        │  │  - "URL no vàlida"          │
│  - Títol                │  │  - "Feed no accessible"     │
│  - Data                 │  │  - "Format RSS invàlid"     │
│  - Imatge (si existeix) │  │  - "Feed buit"              │
│                         │  │                             │
│  [Cancel·lar] [Guardar] │  │  [Tornar a intentar]        │
└─────────────────────────┘  └────────────────────────────┘
```

### Flux d'Actualització Automàtica (Cron)

```
┌────────────────────────────────────────────────────────────┐
│  Cron job s'executa cada 15 minuts                          │
│  GET /api/cron/fetch-rss (amb CRON_SECRET)                 │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│  Per cada feed actiu on:                                    │
│  - is_active = true                                         │
│  - error_count < 5                                          │
│  - last_fetched_at < NOW() - refresh_minutes                │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│  Fetch del feed:                                            │
│  - Timeout: 10 segons                                       │
│  - User-Agent: "Publicat/1.0"                              │
└───────────────────────┬────────────────────────────────────┘
                        │
           ┌────────────┴────────────┐
           │                         │
           ▼ (Èxit)                  ▼ (Error)
┌─────────────────────────┐  ┌────────────────────────────┐
│  Processar ítems:       │  │  Incrementar error_count    │
│  - UPSERT per guid      │  │  Guardar last_error         │
│  - Eliminar ítems >30d  │  │                             │
│  - Actualitzar          │  │  Si error_count >= 5:       │
│    last_fetched_at      │  │    is_active = false        │
│  - Reset error_count    │  │    Notificar editor         │
└─────────────────────────┘  └────────────────────────────┘
```

---

## 🎨 Interfície d'Usuari

### Pàgina Principal: `/rss`

```
┌────────────────────────────────────────────────────────────────┐
│  HEADER (60px fix) + SIDEBAR (70px)                            │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│  Breadcrumb: Home > Feeds RSS                                  │
├────────────────────────────────────────────────────────────────┤
│  CAPÇALERA                                                      │
│  Feeds RSS                                    [+ Afegir Feed]  │
│  Gestiona els feeds de notícies del teu centre                 │
├────────────────────────────────────────────────────────────────┤
│  TABS                                                           │
│  [Feeds] [Configuració] [Ordre de Rotació]                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📰 FEEDS ACTIUS (3)                                           │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📰 La Vanguardia - Catalunya                              │ │
│  │    https://lavanguardia.com/rss/catalunya.xml            │ │
│  │    ✅ Actiu · ✅ En rotació · Última actualització: fa 5m  │ │
│  │    15 ítems · 0 errors                                    │ │
│  │                                    [✏️ Editar] [🗑️]       │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📰 324 - Últimes notícies                                 │ │
│  │    https://324.cat/rss                                    │ │
│  │    ✅ Actiu · ✅ En rotació · Última actualització: fa 10m │ │
│  │    20 ítems · 0 errors                                    │ │
│  │                                    [✏️ Editar] [🗑️]       │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📰 El Temps - Previsió                                    │ │
│  │    https://eltemps.cat/rss/previsions                    │ │
│  │    ✅ Actiu · ❌ No en rotació · Última actualització: fa 1h│ │
│  │    5 ítems · 0 errors                                     │ │
│  │                                    [✏️ Editar] [🗑️]       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ⚠️ FEEDS AMB ERRORS (1)                                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📰 Feed Trencat                                           │ │
│  │    https://exemple.com/rss                                │ │
│  │    ❌ Desactivat automàticament · 5 errors consecutius    │ │
│  │    Últim error: "Timeout - no resposta"                   │ │
│  │                           [🔄 Reintentar] [✏️] [🗑️]       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Tab: Configuració `/rss?tab=config`

```
┌────────────────────────────────────────────────────────────────┐
│  ⚙️ CONFIGURACIÓ RSS DEL CENTRE                                │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Temps per ítem                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ [====●========================================] 15 segons  │ │
│  └──────────────────────────────────────────────────────────┘ │
│  Quant temps es mostra cada notícia (5-30 segons)              │
│                                                                 │
│  Temps per feed                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ [========●====================================] 120 segons │ │
│  └──────────────────────────────────────────────────────────┘ │
│  Quant temps es mostra cada feed abans de passar al següent    │
│  (60-300 segons)                                               │
│                                                                 │
│  Interval d'actualització                                      │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ [====●========================================] 60 minuts  │ │
│  └──────────────────────────────────────────────────────────┘ │
│  Cada quant es refresca el contingut dels feeds (15-180 min)   │
│                                                                 │
│                                              [💾 Guardar]      │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Tab: Ordre de Rotació `/rss?tab=rotation`

```
┌────────────────────────────────────────────────────────────────┐
│  🔄 ORDRE DE ROTACIÓ                                           │
│  Arrossega els feeds per canviar l'ordre de visualització      │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ ⋮⋮ 1. 📰 La Vanguardia - Catalunya                     │   │
│  │       15 ítems · ✅ En rotació                          │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ ⋮⋮ 2. 📰 324 - Últimes notícies                        │   │
│  │       20 ítems · ✅ En rotació                          │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ────────────── No inclosos a la rotació ──────────────        │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ ⋮⋮ 📰 El Temps - Previsió                              │   │
│  │       5 ítems · ❌ No en rotació  [+ Afegir a rotació]  │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  💡 Els feeds es mostraran en l'ordre indicat a la pantalla    │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Modal: Afegir/Editar Feed

```
┌────────────────────────────────────────────────────────────┐
│  [X] Afegir nou Feed RSS                                   │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Nom del feed *                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ La Vanguardia - Catalunya                            │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  URL del feed *                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ https://lavanguardia.com/rss/catalunya.xml           │ │
│  └──────────────────────────────────────────────────────┘ │
│  ✅ Feed vàlid - 15 ítems trobats                          │
│                                                             │
│  ☑ Incloure a la rotació de pantalla                       │
│                                                             │
│  ────────────── Preview dels ítems ──────────────          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 🖼️ Títol de la primera notícia                       │ │
│  │    Fa 2 hores                                        │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 🖼️ Títol de la segona notícia                        │ │
│  │    Fa 3 hores                                        │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 🖼️ Títol de la tercera notícia                       │ │
│  │    Fa 5 hores                                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│                              [Cancel·lar] [💾 Guardar]     │
└────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementació Tècnica

### API Routes

#### `GET /api/rss`
Obté tots els feeds RSS del centre de l'usuari.

**Query parameters:**
```typescript
interface RSSQuery {
  centerId?: string;      // Filtrar per centre (admin global)
  includeItems?: boolean; // Incloure últims ítems (default: false)
  onlyActive?: boolean;   // Només feeds actius (default: false)
}
```

**Resposta:**
```json
{
  "feeds": [
    {
      "id": "uuid",
      "center_id": "uuid",
      "name": "La Vanguardia - Catalunya",
      "url": "https://lavanguardia.com/rss/catalunya.xml",
      "is_active": true,
      "is_in_rotation": true,
      "last_fetched_at": "2026-01-20T10:00:00Z",
      "last_error": null,
      "error_count": 0,
      "item_count": 15,
      "created_at": "2026-01-15T09:00:00Z"
    }
  ],
  "settings": {
    "seconds_per_item": 15,
    "seconds_per_feed": 120,
    "refresh_minutes": 60
  }
}
```

---

#### `POST /api/rss/validate`
Valida un feed RSS sense guardar-lo.

**Body:**
```json
{
  "url": "https://exemple.com/rss.xml"
}
```

**Resposta (èxit):**
```json
{
  "valid": true,
  "feed_title": "Nom del Feed",
  "item_count": 15,
  "preview": [
    {
      "title": "Títol de la notícia",
      "description": "Descripció curta...",
      "link": "https://...",
      "pub_date": "2026-01-20T08:00:00Z",
      "image_url": "https://..."
    }
  ]
}
```

**Resposta (error):**
```json
{
  "valid": false,
  "error": "INVALID_URL" | "TIMEOUT" | "NOT_FOUND" | "INVALID_FORMAT" | "EMPTY_FEED",
  "message": "Descripció llegible de l'error"
}
```

---

#### `POST /api/rss`
Crea un nou feed RSS.

**Body:**
```json
{
  "name": "La Vanguardia - Catalunya",
  "url": "https://lavanguardia.com/rss/catalunya.xml",
  "is_in_rotation": true
}
```

**Validacions:**
- Nom no buit
- URL vàlida i accessible (re-validació)
- Usuari té permisos (editor_profe o admin_global)

---

#### `PATCH /api/rss/[id]`
Actualitza un feed RSS.

**Body:**
```json
{
  "name": "Nou nom del feed",
  "url": "https://nou-url.com/rss.xml",
  "is_active": true,
  "is_in_rotation": false
}
```

---

#### `DELETE /api/rss/[id]`
Elimina un feed RSS.

**Efecte:** DELETE CASCADE elimina també tots els `rss_items` associats.

---

#### `PATCH /api/rss/settings`
Actualitza la configuració RSS del centre.

**Body:**
```json
{
  "seconds_per_item": 15,
  "seconds_per_feed": 120,
  "refresh_minutes": 60
}
```

**Validacions:**
- seconds_per_item: 5-30
- seconds_per_feed: 60-300
- refresh_minutes: 15-180

---

#### `PATCH /api/rss/rotation`
Actualitza l'ordre de rotació dels feeds.

**Body:**
```json
{
  "feeds": [
    { "feed_id": "uuid1", "position": 0 },
    { "feed_id": "uuid2", "position": 1 }
  ]
}
```

---

#### `POST /api/rss/[id]/retry`
Reintentar fetch d'un feed amb errors.

**Lògica:**
- Reset error_count a 0
- is_active = true
- Executar fetch immediat

---

#### `GET /api/cron/fetch-rss`
Endpoint per al cron job (Vercel Cron).

**Headers requerits:**
```
Authorization: Bearer ${CRON_SECRET}
```

**Lògica:**
1. Obtenir tots els feeds actius on `error_count < 5`
2. Per cada feed que necessita actualització:
   - Fetch amb timeout 10s
   - Parse RSS/Atom
   - UPSERT ítems per guid
   - Eliminar ítems >30 dies
   - Actualitzar last_fetched_at
3. Si error:
   - Incrementar error_count
   - Guardar last_error
   - Si error_count >= 5: desactivar feed

**Configuració Vercel (`vercel.json`):**
```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-rss",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

---

### Llibreria RSS Parser

**Instal·lació:**
```bash
npm install rss-parser
```

**Ús:**
```typescript
import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 10000, // 10 segons
  headers: {
    'User-Agent': 'Publicat/1.0 (https://publicat.cat)',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
  },
});

async function parseFeed(url: string) {
  try {
    const feed = await parser.parseURL(url);
    return {
      title: feed.title,
      items: feed.items.map(item => ({
        guid: item.guid || item.link || item.title,
        title: item.title,
        description: item.contentSnippet || item.content,
        link: item.link,
        pub_date: item.pubDate ? new Date(item.pubDate) : null,
        image_url: extractImage(item),
      })),
    };
  } catch (error) {
    throw new Error(`Error parsing feed: ${error.message}`);
  }
}

function extractImage(item: any): string | null {
  // Intentar diferents fonts d'imatge
  if (item.enclosure?.url) return item.enclosure.url;
  if (item['media:content']?.$.url) return item['media:content'].$.url;
  if (item['media:thumbnail']?.$.url) return item['media:thumbnail'].$.url;
  // Extreure del contingut HTML
  const imgMatch = item.content?.match(/<img[^>]+src="([^"]+)"/);
  if (imgMatch) return imgMatch[1];
  return null;
}
```

---

## 🎨 Components React

### `RSSFeedList.tsx`
Llista principal de feeds amb filtres.

```typescript
'use client';

interface RSSFeedListProps {
  onEdit: (feedId: string) => void;
  onDelete: (feedId: string) => void;
}

export default function RSSFeedList({ onEdit, onDelete }: RSSFeedListProps) {
  const [feeds, setFeeds] = useState<RSSFeed[]>([]);
  const [settings, setSettings] = useState<RSSSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    const res = await fetch('/api/rss');
    const data = await res.json();
    setFeeds(data.feeds);
    setSettings(data.settings);
    setLoading(false);
  };

  // Separar feeds actius i amb errors
  const activeFeeds = feeds.filter(f => f.is_active && f.error_count < 5);
  const errorFeeds = feeds.filter(f => !f.is_active || f.error_count >= 5);

  // ... render
}
```

### `RSSFeedCard.tsx`
Targeta individual de feed.

```typescript
interface RSSFeedCardProps {
  feed: RSSFeed;
  onEdit: () => void;
  onDelete: () => void;
  onRetry?: () => void;
}
```

### `RSSFeedForm.tsx`
Formulari de creació/edició amb validació en temps real.

```typescript
interface RSSFeedFormProps {
  feed?: RSSFeed; // Si existeix, mode edició
  onSave: (feed: RSSFeed) => void;
  onCancel: () => void;
}
```

### `RSSConfigForm.tsx`
Formulari de configuració del centre.

```typescript
interface RSSConfigFormProps {
  settings: RSSSettings;
  onSave: (settings: RSSSettings) => void;
}
```

### `RSSRotationOrder.tsx`
Llista drag & drop per ordenar rotació.

```typescript
interface RSSRotationOrderProps {
  feeds: RSSFeed[];
  onReorder: (orderedFeeds: { feed_id: string; position: number }[]) => void;
}
```

### `RSSDisplay.tsx` (per M6)
Component de visualització per a la pantalla principal.

```typescript
interface RSSDisplayProps {
  centerId: string;
}

export default function RSSDisplay({ centerId }: RSSDisplayProps) {
  const [items, setItems] = useState<RSSItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [settings, setSettings] = useState<RSSSettings | null>(null);

  useEffect(() => {
    // Fetch feeds i ítems
    // Timer per rotar ítems segons settings
  }, [centerId]);

  // Render actual item amb animacions
}
```

---

## 🔐 Permisos per Rol

### Editor-profe
```typescript
{
  viewFeeds: true,           // Veure feeds del seu centre
  createFeed: true,          // Crear nous feeds
  editFeed: true,            // Editar feeds del seu centre
  deleteFeed: true,          // Eliminar feeds del seu centre
  configureSettings: true,   // Modificar configuració RSS
  manageRotation: true,      // Ordenar rotació
}
```

### Editor-alumne
```typescript
{
  viewFeeds: false,          // NO pot veure gestió RSS
  createFeed: false,
  editFeed: false,
  deleteFeed: false,
  configureSettings: false,
  manageRotation: false,
}
```

### Admin Global
```typescript
{
  viewFeeds: true,           // Veure feeds de TOTS els centres
  createFeed: true,          // Crear feeds (pot triar centre)
  editFeed: true,            // Editar qualsevol feed
  deleteFeed: true,          // Eliminar qualsevol feed
  configureSettings: true,   // Configurar qualsevol centre
  manageRotation: true,      // Ordenar rotació de qualsevol centre
  createGlobalFeed: true,    // Crear feeds globals (center_id = NULL)
}
```

### Display
```typescript
{
  viewFeeds: true,           // Només lectura per mostrar a pantalla
  // Resta: false
}
```

---

## 🛡️ RLS Policies

### `rss_feeds`

```sql
-- SELECT: Usuaris veuen feeds del seu centre + admin_global veu tots
CREATE POLICY "Users can view own center feeds"
ON rss_feeds FOR SELECT
TO authenticated
USING (
  center_id = (SELECT center_id FROM users WHERE id = auth.uid())
  OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
  OR center_id IS NULL  -- Feeds globals
);

-- INSERT: editor_profe i admin_global
CREATE POLICY "Editors can create feeds"
ON rss_feeds FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('editor_profe', 'admin_global')
  AND (
    center_id = (SELECT center_id FROM users WHERE id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
  )
);

-- UPDATE/DELETE: editor_profe del seu centre + admin_global
CREATE POLICY "Editors can modify feeds"
ON rss_feeds FOR UPDATE
TO authenticated
USING (
  (
    (SELECT role FROM users WHERE id = auth.uid()) = 'editor_profe'
    AND center_id = (SELECT center_id FROM users WHERE id = auth.uid())
  )
  OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);
```

### `rss_items`

```sql
-- SELECT: Hereda permisos del feed pare
CREATE POLICY "Users can view feed items"
ON rss_items FOR SELECT
TO authenticated
USING (
  feed_id IN (
    SELECT id FROM rss_feeds
    WHERE center_id = (SELECT center_id FROM users WHERE id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
    OR center_id IS NULL
  )
);

-- INSERT/UPDATE/DELETE: Només sistema (service role)
-- Els ítems es gestionen via cron job
```

---

## 📋 Tasques d'Implementació

### Fase 1: Base de Dades (1 dia)

**1. Migració SQL**
- [ ] Crear taula `rss_feeds`
- [ ] Crear taula `rss_items`
- [ ] Crear taula `rss_center_settings`
- [ ] Crear taula `rss_rotation_order`
- [ ] Crear índexs necessaris
- [ ] Implementar RLS policies
- [ ] Crear trigger per `updated_at`

### Fase 2: API Routes (2 dies)

**2. CRUD Feeds**
- [ ] `GET /api/rss` - Llistar feeds
- [ ] `POST /api/rss` - Crear feed
- [ ] `PATCH /api/rss/[id]` - Actualitzar feed
- [ ] `DELETE /api/rss/[id]` - Eliminar feed
- [ ] `POST /api/rss/[id]/retry` - Reintentar feed

**3. Validació i Configuració**
- [ ] `POST /api/rss/validate` - Validar feed
- [ ] `PATCH /api/rss/settings` - Actualitzar configuració
- [ ] `PATCH /api/rss/rotation` - Actualitzar ordre rotació

**4. Cron Job**
- [ ] `GET /api/cron/fetch-rss` - Actualització automàtica
- [ ] Configurar Vercel Cron

### Fase 3: Components UI (3 dies)

**5. Pàgina Principal**
- [ ] `page.tsx` (`/rss`) - Pàgina amb tabs
- [ ] `RSSFeedList.tsx` - Llista de feeds
- [ ] `RSSFeedCard.tsx` - Targeta individual

**6. Formularis**
- [ ] `RSSFeedForm.tsx` - Crear/editar feed
- [ ] `RSSFeedFormModal.tsx` - Modal wrapper
- [ ] `RSSConfigForm.tsx` - Configuració

**7. Rotació**
- [ ] `RSSRotationOrder.tsx` - Drag & drop
- [ ] Integració amb @dnd-kit

### Fase 4: Validació i Preview (1 dia)

**8. Validació en Temps Real**
- [ ] Hook `useRSSValidation.ts`
- [ ] Debounce de validació
- [ ] Preview d'ítems al formulari
- [ ] Missatges d'error clars

### Fase 5: Testing i Poliment (1 dia)

**9. Tests Funcionals**
- [ ] Crear feed amb URL vàlida
- [ ] Validació rebutja URLs invàlides
- [ ] Cron job actualitza feeds
- [ ] Gestió d'errors consecutius
- [ ] Configuració es guarda correctament
- [ ] Ordre de rotació persistent

**10. UX**
- [ ] Loading states
- [ ] Toast notifications
- [ ] Empty states
- [ ] Confirmació eliminar

---

## 🧪 Casos de Test

### Test 1: Crear feed RSS vàlid
```
1. Login com Editor-profe
2. Accedir /rss
3. Clic "Afegir Feed"
4. Introduir URL: https://feeds.bbci.co.uk/news/rss.xml
5. Esperar validació (spinner)
6. ✅ Verificar: Preview de 3 ítems
7. Introduir nom: "BBC News"
8. Clic "Guardar"
9. ✅ Verificar: Feed apareix a la llista
```

### Test 2: Rebutjar URL invàlida
```
1. Login com Editor-profe
2. Accedir /rss > Afegir Feed
3. Introduir URL: https://google.com (no és RSS)
4. Esperar validació
5. ✅ Verificar: Error "Format RSS invàlid"
6. ✅ Verificar: Botó Guardar desactivat
```

### Test 3: Gestió d'errors consecutius
```
1. Crear feed amb URL que falla intermitentment
2. Simular 5 errors consecutius via cron
3. ✅ Verificar: Feed es desactiva automàticament
4. ✅ Verificar: Apareix a secció "Feeds amb errors"
5. Clic "Reintentar"
6. ✅ Verificar: error_count es reseteja
```

### Test 4: Configuració de timings
```
1. Login com Editor-profe
2. Accedir /rss?tab=config
3. Canviar seconds_per_item a 20
4. Guardar
5. ✅ Verificar: Toast "Configuració guardada"
6. Refrescar pàgina
7. ✅ Verificar: Valor persisteix
```

### Test 5: Ordre de rotació
```
1. Tenir 3 feeds actius en rotació
2. Accedir /rss?tab=rotation
3. Arrossegar feed 3 a posició 1
4. ✅ Verificar: Ordre actualitzat visualment
5. Refrescar pàgina
6. ✅ Verificar: Ordre persistent
```

### Test 6: Permisos Editor-alumne
```
1. Login com Editor-alumne
2. Intentar accedir /rss
3. ✅ Verificar: Redirect o missatge "No tens permisos"
4. Verificar sidebar no mostra opció RSS
```

---

## ⚠️ Riscos i Mitigacions

| Risc | Probabilitat | Impacte | Mitigació |
|------|--------------|---------|-----------|
| **Feeds malformats** | 🟡 Mitjana | 🟢 Baix | Parser robust + try/catch + gestió d'errors |
| **Feeds molt grans** | 🟢 Baixa | 🟢 Baix | Limitar a 50 ítems més recents |
| **Timeout de fetch** | 🟡 Mitjana | 🟢 Baix | Timeout 10s + retry automàtic |
| **Rate limiting extern** | 🟢 Baixa | 🟡 Mitjà | User-Agent correcte + intervals raonables |
| **Feeds sense imatges** | 🟡 Mitjana | 🟢 Baix | Placeholder image per defecte |
| **CORS en validació** | 🟡 Mitjana | 🟡 Mitjà | Validació sempre via backend, mai client |
| **Cron job falla** | 🟢 Baixa | 🟡 Mitjà | Logging + alertes si no s'executa |

---

## 📊 Mètriques d'Èxit

### Funcionals
- ✅ Validació de feeds funciona amb >95% dels feeds comuns
- ✅ Cron job s'executa cada 15 minuts sense errors
- ✅ Feeds amb errors es desactiven automàticament
- ✅ Ordre de rotació persistent i correcte

### UX
- ✅ Temps de validació <5 segons per feed
- ✅ Preview d'ítems visible abans de guardar
- ✅ Missatges d'error clars i accionables

### Integració
- ✅ API `/api/rss` retorna feeds ordenats per rotació
- ✅ Preparat per M6: Component `RSSDisplay` reutilitzable
- ✅ Settings de centre respectats per display

---

## 🚀 Pròxims Passos (Post-M5)

Un cop completat M5, el següent milestone serà **M6: Pantalla Principal (MVP)**, que implementarà:

- Layout de 3 zones (vídeo principal, anuncis, RSS)
- Mode Display per TV (fullscreen, autoplay)
- Integració del component `RSSDisplay` creat en M5
- Reproducció seqüencial de llistes

**Prerequisits de M5 per M6:**
- Taules RSS creades i poblades
- API per obtenir feeds i ítems
- Component `RSSDisplay` funcional
- Configuració de timings per centre

---

## 📚 Referències

- [RSS 2.0 Specification](https://www.rssboard.org/rss-specification)
- [Atom Syndication Format](https://www.rfc-editor.org/rfc/rfc4287)
- [rss-parser npm](https://www.npmjs.com/package/rss-parser)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [dnd-kit Documentation](https://docs.dndkit.com/)

---

**Data de creació:** 19 gener 2026
**Estat:** Pendent implementació
**Responsable:** Equip de desenvolupament
**Prioritat:** Alta (bloqueador per M6 - Pantalla Principal)
