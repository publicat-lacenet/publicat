# Milestone 6: Pantalla de Display (MVP)

**Objectiu:** Sistema de visualització per a pantalles TV amb reproducció automàtica de vídeos, anuncis i feeds RSS en un layout de 3 zones.

**Durada estimada:** 2 setmanes
**Dependències:** M4 (playlists) i M5 (RSS) completats
**Risc:** 🟡 Mitjà (integració de Vimeo player, gestió d'autoplay)
**Estat:** PENDENT

---

## 📋 Objectiu

Implementar una pantalla de visualització optimitzada per a TV/monitors que mostri:

1. **Zona Principal (70%)**: Vídeos de la llista del dia actual o llista seleccionada
2. **Zona d'Anuncis (30% superior dreta)**: Vídeos de la llista d'anuncis en rotació
3. **Zona RSS (30% inferior dreta)**: Notícies dels feeds RSS configurats

La pantalla ha de funcionar en **mode fullscreen**, sense interacció de l'usuari, reproduint contingut de forma contínua i automàtica.

---

## 🎯 Criteris d'Acceptació

### Mode Display Bàsic
- [ ] Pantalla fullscreen optimitzada per TV (16:9)
- [ ] Sense controls visibles (mouse cursor ocult)
- [ ] Reproducció automàtica sense interacció
- [ ] Funcionament 24/7 sense degradació de memòria
- [ ] Reconnexió automàtica si es perd connexió

### Zona Principal (Vídeos)
- [ ] Reproduir vídeos de la llista del dia actual (Dilluns, Dimarts, etc.)
- [ ] Transicions suaus entre vídeos (fade)
- [ ] Si la llista està buida, mostrar pantalla de "standby" elegant
- [ ] Quan acaba la llista, reiniciar des del principi
- [ ] Mostrar títol del vídeo durant els primers 5 segons

### Zona d'Anuncis
- [ ] Reproduir vídeos de la llista "Anuncis" en bucle
- [ ] Rotació independent de la zona principal
- [ ] Volum reduït o silenciat (configurable)
- [ ] Si no hi ha anuncis, amagar la zona o mostrar logo del centre

### Zona RSS
- [ ] Mostrar ítems dels feeds configurats a M5
- [ ] Rotació automàtica segons configuració del centre (seconds_per_item)
- [ ] Canvi de feed segons configuració (seconds_per_feed)
- [ ] Mostrar: títol, imatge (si existeix), font del feed
- [ ] Transicions animades (slide/fade)

### Selecció de Contingut
- [ ] Per defecte: llista del dia actual segons el dia de la setmana
- [ ] Override manual: paràmetre `?playlist=UUID` per forçar una llista
- [ ] Override per data: respectar `schedule_overrides` si existeix (futur)

### Rol Display
- [ ] Usuaris amb rol `display` van directament a `/pantalla`
- [ ] Sense accés a navegació ni altres pàgines
- [ ] Només botó de "Sortir" visible (petit, cantonada)
- [ ] Login automàtic persistent (remember session)

### Configuració per Centre
- [ ] Cada centre té la seva configuració de display
- [ ] Logo del centre visible (cantonada)
- [ ] Colors corporatius opcionals
- [ ] Rellotge opcional (HH:MM)

---

## 🖥️ Layout de Pantalla

```
┌─────────────────────────────────────────────────────────────────────┐
│                           HEADER (opcional, 40px)                    │
│  [Logo Centre]                                    [HH:MM] [Rellotge] │
├───────────────────────────────────────────┬─────────────────────────┤
│                                           │                         │
│                                           │    ZONA ANUNCIS         │
│                                           │    (Vídeos tipus        │
│           ZONA PRINCIPAL                  │     announcement)       │
│           (Vídeo del dia)                 │                         │
│                                           │    Aspect: 16:9         │
│           Aspect: 16:9                    │    Muted opcional       │
│           Autoplay                        │                         │
│           Loop                            ├─────────────────────────┤
│                                           │                         │
│                                           │    ZONA RSS             │
│                                           │    (Feeds de notícies)  │
│                                           │                         │
│                                           │    [Imatge] Títol...    │
│                                           │    Font: BBC News       │
│                                           │                         │
├───────────────────────────────────────────┴─────────────────────────┤
│                    FOOTER TICKER (opcional, 40px)                    │
│  >>> Notícia en moviment... >>> Pròxim anunci... >>> Hora actual <<< │
└─────────────────────────────────────────────────────────────────────┘
```

### Proporcions Recomanades
- **Zona Principal**: 70% width, 100% height (sense header/footer)
- **Zona Dreta**: 30% width, dividida en:
  - Anuncis: 50% height
  - RSS: 50% height
- **Header/Footer**: Opcionals, 40px cada un

---

## 🔧 Implementació Tècnica

### Components React

#### `DisplayScreen.tsx`
Component principal que orquestra les 3 zones.

```typescript
interface DisplayScreenProps {
  centerId: string;
  playlistOverride?: string;  // UUID de llista específica
  showHeader?: boolean;
  showTicker?: boolean;
}
```

#### `VideoZone.tsx`
Reproductor de vídeos Vimeo amb autoplay.

```typescript
interface VideoZoneProps {
  playlistId: string;
  muted?: boolean;
  onVideoEnd?: () => void;
  showTitle?: boolean;
}
```

#### `AnnouncementZone.tsx`
Reproductor de vídeos d'anuncis en bucle.

```typescript
interface AnnouncementZoneProps {
  centerId: string;
  muted?: boolean;
}
```

#### `RSSZone.tsx`
Rotació de notícies RSS (ja preparat a M5).

```typescript
interface RSSZoneProps {
  centerId: string;
  secondsPerItem?: number;
  secondsPerFeed?: number;
}
```

### API Routes Noves

#### `GET /api/display/config`
Obté configuració de display per al centre.

```json
{
  "center": {
    "id": "uuid",
    "name": "Escola XYZ",
    "logo_url": "https://..."
  },
  "current_playlist": {
    "id": "uuid",
    "name": "Dimarts",
    "kind": "weekday"
  },
  "announcements_playlist": {
    "id": "uuid",
    "name": "Anuncis",
    "video_count": 5
  },
  "rss_settings": {
    "seconds_per_item": 15,
    "seconds_per_feed": 120
  },
  "display_settings": {
    "show_header": true,
    "show_clock": true,
    "show_ticker": false,
    "primary_color": "#FEDD2C"
  }
}
```

#### `GET /api/display/playlist/[id]`
Obté vídeos d'una llista amb URLs de Vimeo.

```json
{
  "playlist": {
    "id": "uuid",
    "name": "Dimarts"
  },
  "videos": [
    {
      "id": "uuid",
      "title": "Benvinguda",
      "vimeo_id": "123456789",
      "vimeo_hash": "abc123",
      "duration_seconds": 120,
      "thumbnail_url": "https://..."
    }
  ]
}
```

### Integració Vimeo Player

Utilitzar `@vimeo/player` per control programàtic:

```typescript
import Player from '@vimeo/player';

const player = new Player(iframeRef.current, {
  id: vimeoId,
  h: vimeoHash,  // Per vídeos unlisted
  autoplay: true,
  muted: false,
  loop: false,
  controls: false,
  background: true,  // Mode background (sense UI)
});

player.on('ended', () => {
  // Passar al següent vídeo
});
```

---

## 🗄️ Estructura de Dades

### Nova Taula: `display_settings`

| Camp | Tipus | Descripció |
|------|-------|------------|
| `center_id` | uuid | PK + FK → centers(id) |
| `show_header` | boolean | Mostrar capçalera amb logo (default: true) |
| `show_clock` | boolean | Mostrar rellotge (default: true) |
| `show_ticker` | boolean | Mostrar ticker inferior (default: false) |
| `ticker_speed` | int | Velocitat del ticker en px/s (default: 50) |
| `primary_color` | text | Color principal hex (default: #FEDD2C) |
| `standby_message` | text | Missatge quan no hi ha contingut |
| `announcement_volume` | int | Volum anuncis 0-100 (default: 0 = muted) |
| `updated_at` | timestamptz | Última actualització |

### Migració SQL

```sql
-- M6: Display Settings
CREATE TABLE display_settings (
    center_id uuid PRIMARY KEY REFERENCES centers(id) ON DELETE CASCADE,
    show_header boolean NOT NULL DEFAULT true,
    show_clock boolean NOT NULL DEFAULT true,
    show_ticker boolean NOT NULL DEFAULT false,
    ticker_speed int NOT NULL DEFAULT 50,
    primary_color text NOT NULL DEFAULT '#FEDD2C',
    standby_message text DEFAULT 'Pròximament...',
    announcement_volume int NOT NULL DEFAULT 0 CHECK (announcement_volume >= 0 AND announcement_volume <= 100),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE display_settings ENABLE ROW LEVEL SECURITY;

-- RLS: Editors poden veure i modificar, display pot llegir
CREATE POLICY "Users can view own center display settings"
ON display_settings FOR SELECT
TO authenticated
USING (
  center_id = (SELECT center_id FROM users WHERE id = auth.uid())
  OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

CREATE POLICY "Editors can update display settings"
ON display_settings FOR ALL
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('editor_profe', 'admin_global')
  AND (
    center_id = (SELECT center_id FROM users WHERE id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
  )
)
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('editor_profe', 'admin_global')
  AND (
    center_id = (SELECT center_id FROM users WHERE id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
  )
);

CREATE TRIGGER tr_display_settings_updated_at
BEFORE UPDATE ON display_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## 🎨 Interfície d'Usuari

### Pàgina de Configuració: `/pantalla/config`

Per editors, una pàgina per configurar com es veu la pantalla:

```
┌────────────────────────────────────────────────────────────────┐
│  Configuració de Pantalla                                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ☑ Mostrar capçalera amb logo                                  │
│  ☑ Mostrar rellotge                                            │
│  ☐ Mostrar ticker de notícies                                  │
│                                                                 │
│  Color principal: [#FEDD2C] [🎨]                               │
│                                                                 │
│  Missatge de standby:                                          │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Pròximament...                                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Volum dels anuncis: [====○===============] 0%                 │
│                                                                 │
│  ────────────── Vista Prèvia ──────────────                    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ [Mini preview de com es veurà la pantalla]               │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                    [Cancel·lar] [💾 Guardar]   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### URL de Pantalla

La pantalla es pot accedir via:
- `/pantalla` - Llista del dia actual
- `/pantalla?playlist=UUID` - Llista específica
- `/pantalla?fullscreen=true` - Mode pantalla completa automàtic

---

## 🔐 Permisos per Rol

### Display
```typescript
{
  viewDisplay: true,        // Veure pantalla de reproducció
  configureDisplay: false,  // NO pot configurar
  viewOtherPages: false,    // Redirigit si intenta accedir altres pàgines
}
```

### Editor-profe
```typescript
{
  viewDisplay: true,         // Pot fer preview de la pantalla
  configureDisplay: true,    // Pot configurar display del seu centre
  accessDisplaySettings: true,
}
```

### Admin Global
```typescript
{
  viewDisplay: true,         // Pot veure qualsevol pantalla
  configureDisplay: true,    // Pot configurar qualsevol centre
  viewDisplayStats: true,    // Pot veure estadístiques (futur)
}
```

---

## 📋 Tasques d'Implementació

### Fase 1: Base de Dades (0.5 dies)

**1. Migració SQL**
- [ ] Crear taula `display_settings`
- [ ] Implementar RLS policies
- [ ] Crear trigger updated_at
- [ ] Seed amb configuració per defecte per centres existents

### Fase 2: API Routes (1 dia)

**2. Endpoints de Display**
- [ ] `GET /api/display/config` - Configuració completa
- [ ] `GET /api/display/playlist/[id]` - Vídeos de llista amb Vimeo data
- [ ] `GET /api/display/announcements` - Vídeos d'anuncis
- [ ] `PATCH /api/display/settings` - Actualitzar configuració

### Fase 3: Components Core (3 dies)

**3. Reproductor de Vídeo**
- [ ] `VideoPlayer.tsx` - Wrapper de Vimeo Player
- [ ] Control d'autoplay i events (ended, error)
- [ ] Gestió de vídeos unlisted (hash)
- [ ] Fallback si vídeo no carrega

**4. Zones de Contingut**
- [ ] `VideoZone.tsx` - Zona principal amb llista
- [ ] `AnnouncementZone.tsx` - Zona d'anuncis
- [ ] `RSSZone.tsx` - Zona de notícies (adaptar de M5)

**5. Layout Principal**
- [ ] `DisplayLayout.tsx` - Grid responsive de 3 zones
- [ ] Header/Footer opcionals
- [ ] Transicions animades

### Fase 4: Pàgina de Display (2 dies)

**6. Pantalla Principal**
- [ ] `/pantalla/page.tsx` - Pàgina completa
- [ ] Detecció del dia actual
- [ ] Mode fullscreen
- [ ] Ocultació del cursor
- [ ] Gestió d'errors i reconnexió

**7. Configuració**
- [ ] `/pantalla/config/page.tsx` - Pàgina de settings
- [ ] Formulari de configuració
- [ ] Preview en temps real
- [ ] Guardat automàtic

### Fase 5: Testing i Polish (1.5 dies)

**8. Tests Funcionals**
- [ ] Reproducció contínua sense errors
- [ ] Transicions entre vídeos
- [ ] Rotació RSS correcta
- [ ] Mode fullscreen en diferents navegadors
- [ ] Recuperació d'errors de xarxa

**9. Optimització**
- [ ] Preload del següent vídeo
- [ ] Gestió de memòria (evitar memory leaks)
- [ ] Performance en TV/dispositius de baixa potència

---

## 🧪 Casos de Test

### Test 1: Reproducció Automàtica
```
1. Accedir a /pantalla amb usuari display
2. Verificar que carrega la llista del dia actual
3. ✅ Vídeo es reprodueix automàticament
4. ✅ Quan acaba, passa al següent
5. ✅ Quan acaba l'últim, torna al primer
```

### Test 2: Zones Independents
```
1. Accedir a /pantalla amb vídeos i anuncis configurats
2. ✅ Vídeo principal es reprodueix
3. ✅ Anuncis es reprodueixen en paral·lel (muted)
4. ✅ RSS rota independentment
5. ✅ No hi ha interferència entre zones
```

### Test 3: Configuració de Display
```
1. Accedir a /pantalla/config com editor_profe
2. Desmarcar "Mostrar capçalera"
3. Guardar
4. Obrir /pantalla en nova pestanya
5. ✅ Capçalera no es mostra
```

### Test 4: Llista Buida
```
1. Crear un centre nou sense vídeos
2. Accedir a /pantalla
3. ✅ Mostra pantalla de standby amb missatge configurat
4. ✅ No hi ha errors de consola
```

### Test 5: Error de Vídeo
```
1. Afegir vídeo amb URL de Vimeo invàlida a una llista
2. Accedir a /pantalla
3. ✅ Quan falla el vídeo, salta al següent
4. ✅ Mostra indicador visual breu d'error (opcional)
```

---

## ⚠️ Riscos i Mitigacions

| Risc | Probabilitat | Impacte | Mitigació |
|------|--------------|---------|-----------|
| **Autoplay bloquejat** | 🟡 Mitjà | 🔴 Alt | Requerir interacció inicial, usar muted primer |
| **Vimeo rate limiting** | 🟢 Baix | 🟡 Mitjà | Caché agressiu, preload limitat |
| **Memory leaks** | 🟡 Mitjà | 🔴 Alt | Cleanup d'iframes, monitoring |
| **Pèrdua de connexió** | 🟡 Mitjà | 🟡 Mitjà | Retry automàtic, contingut offline (futur) |
| **Vídeos privats** | 🟢 Baix | 🟢 Baix | Validació a l'afegir vídeos |
| **TV sense WebGL** | 🟢 Baix | 🟢 Baix | Fallback CSS per transicions |

---

## 📊 Mètriques d'Èxit

### Funcionals
- ✅ Pantalla funciona 24h sense reiniciar
- ✅ Transicions <500ms entre vídeos
- ✅ RSS rota correctament segons configuració
- ✅ Sense memory leaks després de 1h

### UX
- ✅ Temps de càrrega inicial <3s
- ✅ Fullscreen funciona en Chrome, Firefox, Edge
- ✅ Layout correcte en 1920x1080 i 1280x720

### Integració
- ✅ Respecta configuració de centre
- ✅ Respecta llistes del dia
- ✅ Compatible amb tots els vídeos existents

---

## 🚀 Pròxims Passos (Post-M6)

Un cop completat M6, les següents millores podrien ser:

### M6.1: Millores de Display
- [ ] Ticker de notícies animat
- [ ] Transicions avançades (slide, zoom)
- [ ] Themes per centre

### M6.2: Schedule Overrides
- [ ] Calendari per programar llistes especials
- [ ] Override per dates específiques (festivitats)
- [ ] Preview de programació setmanal

### M6.3: Analytics
- [ ] Tracking de vídeos reproduïts
- [ ] Temps de visualització
- [ ] Dashboard d'estadístiques

### M7: Landing Page Pública
- [ ] Pàgina pública per centres
- [ ] Galeria de vídeos seleccionats
- [ ] Integració amb llista `landing`

---

## 📚 Referències

- [Vimeo Player SDK](https://developer.vimeo.com/player/sdk)
- [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API)
- [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

---

**Data de creació:** 20 gener 2026
**Estat:** Pendent implementació
**Responsable:** Equip de desenvolupament
**Prioritat:** Alta (MVP Demo)
