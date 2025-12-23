# Publicat — overview

## 1) Què és Publicat

**Publicat** és una plataforma web multi-centre (*multi-tenant*) per **mostrar i gestionar contingut audiovisual** (vídeos i anuncis) creat pels centres educatius i reproduir-lo en una **pantalla física de vestíbul** de manera automàtica, cíclica i atractiva.

La vista principal simula (i en mode *display* es converteix en) la composició final que es veurà a la TV: **vídeo principal + anuncis + RSS** en una disposició pensada per **1920×1080 (Full HD)**.

---

## 2) Objectius del producte

- Oferir una **pantalla principal** que reprodueixi automàticament una llista de vídeos del dia, amb una zona d’**anuncis** en bucle i una zona **RSS** informativa. 
- Permetre als centres **gestionar el seu catàleg de vídeos**, metadades i permisos de compartició. 
- Permetre **gestionar llistes de reproducció** (predefinides, personalitzades i globals) i **planificar** canvis per data amb calendari. 
- Permetre configurar i previsualitzar el comportament dels **feeds RSS** (rotació, intervals, actualització i errors). 
- Separar clarament el flux **editorial** del flux d’**administració global** (centres, usuaris, zones i LandingPlaylist pública).

---

## 3) Pantalla principal (core UX)

### Composició
- Barra superior amb logo i opcions de sessió (en mode editor).
- Menú lateral per navegar (Pantalla, Contingut, Llistes, RSS i, si escau, Administració).
- Tres zones de contingut:
  1) **Reproductor principal** (llista del dia per defecte).
  2) **Anuncis** en bucle.
  3) **RSS** amb titulars i rotació de feeds.

### Mode Pantalla Completa
En mode editor existeix un botó per amagar barra i menú i deixar només les 3 zones.

### Mode Display (TV)
Quan inicia sessió un usuari **display**, la pantalla:
- va directament a **pantalla completa**,
- carrega la llista del dia,
- inicia reproducció automàtica (*autoplay*),
- manté una experiència **passiva** (sense menú ni controls d’edició).

---

## 4) Rols d’usuari

Rols principals:
- **Administrador global**: control total (centres, usuaris globals, zones, convidats, elements globals). 
- **Editor-profe**: responsable editorial del centre (vídeos, llistes, RSS i usuaris del centre). 
- **Editor-alumne**: pot pujar vídeos (pendents d’aprovació) i editar llistes només si `isStudentEditable=true`. 
- **Display**: només reproducció passiva en pantalla principal. 
- **Convidat (temporal)**: accés sense autenticació via enllaç temporal, només lectura i només publicat.

---

## 5) Mòduls funcionals

### 5.1 Contingut (catàleg de vídeos)
- Graella de vídeos amb metadades, filtres (centre/zona/tipus/etiquetes/hashtags) i accions (editar, esborrar, afegir a llista).
- **Compartició intercentres**: només es veuen vídeos d’altres centres si són compartits.
- **Integració Vimeo**: l'editor entra una URL de Vimeo que es valida automàticament via API per obtenir thumbnail, durada i metadades. Vegeu `docs/vimeo-integration.md` per detalls tècnics.

### 5.2 Llistes de reproducció
- Llistes predefinides (dies feiners + Anuncis), personalitzades i globals.
- Edició amb **drag&drop**, afegir/eliminar vídeos i restriccions (p. ex. Anuncis només admet contingut tipus *announcement*).
- **Calendari**: assignacions per data (override) que substitueixen la llista del dia quan existeixen.

### 5.3 RSS
- Gestió de feeds i configuració de rotació: durada per titular, durada per feed, ordre (drag&drop), freqüència d’actualització, límit d’ítems.
- Previsualització del comportament i gestió d’errors (feed no disponible, cap feed actiu).

### 5.4 Administració global
- Gestió de centres, usuaris, zones i **LandingPlaylist** (llista pública de la landing).
- LandingPlaylist: única, només editable des d’Administració; només pot incloure contingut que compleixi condicions (p. ex. compartit) i es reordena manualment.

### 5.5 Usuaris del Centre (Editor-profe)
- Pantalla específica perquè l’Editor-profe gestioni usuaris del seu centre:
  - crear per invitació,
  - activar/desactivar (baixa lògica),
  - reenviar invitació només si està pendent d’activació,
  - restriccions per evitar deixar el centre sense cap Editor-profe actiu.

---

## 6) Model de domini (a grans trets)

Entitats clau:
- **Centre** (tenant) i **Zone** (catàleg)
- **User** (perfil d’aplicació vinculat 1:1 amb l’Auth)
- **Video** (+ estat de moderació i `isSharedWithOtherCenters`)
- **Tag** (global) i **Hashtag** (per centre)
- **Playlist** i **PlaylistItem**
- **ScheduleOverride** (assignació per data)
- **RSSFeed**, **RSSCenterSettings** i **RSSRotationOrder**
- **GuestAccessLink** (convidat temporal)

---

## 7) Fluxos essencials

- **Pujar vídeo (alumne)** → queda `pending_approval` i no compartit → **aprovar (profe)** → `published` → opcionalment marcar com a compartit. 
- **Configurar llistes** (ordre, contingut, anuncis) i **planificar** overrides al calendari. 
- **Configurar RSS** (feeds + rotació + intervals) i validar amb previsualització.
- **Reproducció a TV (display)**: sessió perdurable + accés directe a la pantalla principal en pantalla completa.
- **Convidat temporal**: enllaç amb caducitat, només lectura i només publicat.

---

## 8) Mapa de documentació (referència)

- `docs/roles.md` → Rols d’usuari (canònic).
- `docs/domain-model.md` → Model de domini (entitats, relacions, invariants).
- `docs/database.schema.md` → Esquema de la base de dades.
- `docs/vimeo-integration.md` → Integració amb Vimeo (API, validació, thumbnails).
- `docs/storage.md` → Emmagatzematge d'arxius (logos, thumbnails, Supabase Storage).
- `docs/authentication.md` → Autenticació i gestió d'usuaris (invitació, sessions, RLS).
- `docs/moderation-system.md` → Sistema de moderació i notificacions (contingut pendent, aprovació).
- `docs/rss-system.md` → Sistema RSS (validació, caché, retry, rotació).
- `docs/ui/pantalla-principal.md` → Pantalla principal.
- `docs/ui/contingut.md` → Pàgina Contingut.
- `docs/ui/llistes.md` → Pàgina Llistes.
- `docs/ui/rss.md` → Pàgina RSS.
- `docs/ui/admin-global.md` → Administració global + LandingPlaylist.
- `docs/ui/usuaris-centre.md` → Gestió d’usuaris del centre (Editor-profe).
- `docs/ui/guia-estil.md` → Guia d’estil de la UI del projecte.

---

## 9) Fora d’abast (per ara)

- Emmagatzematge/streaming propi de vídeo: el model assumeix allotjament extern (Vimeo) i integració progressiva.
- Funcionalitats avançades de reproducció (transicions, analítica, etc.) més enllà del comportament descrit a les especificacions actuals.
