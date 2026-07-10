# Pantalles i navegacio - PUBLI*CAT

Resum curt i viu de les pantalles principals. Els documents UI llargs antics s'han mogut a `docs/OBSOLET/ui/`.

## Navegacio Principal

- **Contingut** (`/contingut`): gestio i revisio de videos.
- **Llistes** (`/llistes`): mode habitual, playlists, items i calendari.
- **Visor/Pantalla** (`/visor`, `/pantalla`): previsualitzacio i mode display.
- **RSS** (`/rss`): feeds, configuracio i rotacio.
- **Usuaris** (`/usuaris`): gestio d'usuaris del centre.
- **Admin** (`/admin`): centres, zones, usuaris globals i landing.

La navegacio ha de mantenir-se coherent amb `app/components/layout/AppSidebar.tsx`.

## Rols

- `admin_global`: totes les seccions.
- `editor_profe`: contingut, llistes, visor/pantalla, RSS i usuaris del centre.
- `editor_alumne`: contingut, llistes editables segons configuracio i visor quan pertoqui.
- `display`: mode passiu de pantalla, sense edicio.

## Pantalles

### Contingut

- Graella de videos.
- Filtres per estat, centre/zona, tags i hashtags.
- Alta per URL Vimeo o pujada directa.
- Moderacio de pendents i revisio de videos d'alumnes.

### Llistes

- Llista permanent, llistes per dia de la setmana, llistes amb calendari, Anuncis i globals.
- Afegir, treure i reordenar videos.
- Selector de mode habitual (`permanent` o `weekday`) i calendari amb `schedule_overrides`.
- Ticker per dia dins de cada llista `weekday`; si un dia no en té, el display usa el ticker general configurat al Visor.
- Pendent: tancar regla final de `is_student_editable`.

### Pantalla/Visor

- Reproduccio de playlist principal segons calendari i mode habitual.
- Zona d'anuncis.
- RSS.
- Ticker general i configuracio visual segons `display_settings`; el ticker general actua com a reserva dels tickers per dia.

### RSS

- Crear i validar feeds.
- Veure estat/errors.
- Configurar intervals i altura d'imatge.
- Reordenar rotacio.

### Usuaris

- `editor_profe` gestiona usuaris del seu centre.
- `admin_global` gestiona usuaris globalment des d'Admin.
- Invitacions, reenviament i desactivacio.

### Admin

- Centres i zones.
- Usuaris globals.
- Landing publica/global.

## Guia Visual

La font visual continua sent `docs/ui/guia-estil.md`.
