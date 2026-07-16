# M7a: Llista Global a Landing Page

**Data creació:** 6 febrer 2026
**Durada estimada:** 1 dia
**Prioritat:** Alta

---

## Objectiu

Completar la funcionalitat de Llista Global i mostrar-la a la landing page pública amb un reproductor de vídeo 16:9 amb autoplay i loop infinit.

---

## Context

- Ja existeix suport per llistes globals (`kind: 'global'`, `center_id: null`)
- La landing page actual té un quadre blanc informatiu que s'ha de substituir
- Només admin_global pot crear/editar llistes globals
- Altres usuaris (editor_profe) poden copiar la llista global al seu centre

---

## Canvis Requerits

### 1. Backend

#### 1.1 Nova API pública `/api/landing/playlist`
- **GET** sense autenticació
- Retorna la llista global amb els seus vídeos ordenats
- Inclou: vimeo_url, vimeo_hash, title, thumbnail_url, duration_seconds

#### 1.2 Validació al afegir vídeos a llista global
- Modificar `/api/playlists/[id]/route.ts` (PATCH)
- Si la llista és global (`kind: 'global'`), validar que cada vídeo tingui `is_shared_with_other_centers = true`
- Retornar error si s'intenta afegir vídeo no compartit

#### 1.3 Permisos de còpia
- Modificar `/api/playlists/[id]/copy/route.ts`
- Permetre que `editor_profe` (no només admin_global) pugui copiar llistes globals al seu centre

### 2. Frontend - Landing Page

#### 2.1 Component `LandingVideoPlayer`
- Reproductor de vídeo Vimeo en format 16:9
- Autoplay (muted per política de navegadors)
- Loop infinit: quan acaba un vídeo, passa al següent
- Sense controls visibles (només el vídeo)
- Botó flotant "Ampliar" per obrir a pantalla completa en nova pestanya

#### 2.2 Modificar `/app/page.tsx`
- Substituir el quadre blanc (línies 55-88) pel component `LandingVideoPlayer`
- Mantenir el layout responsive (flex-1 per ocupar l'espai)

### 3. Pantalla Completa Landing

#### 3.1 Nova ruta `/pantalla/landing`
- Pàgina pública (sense auth)
- Display a pantalla completa amb la llista global
- Reutilitzar components de DisplayScreen
- Autoplay amb so activat

### 4. UI Llistes

#### 4.1 Permisos d'edició
- A `/llistes/[id]/editar`: mostrar UI d'edició només si és admin_global per llistes globals
- Per altres usuaris: mostrar llista en mode lectura amb botó "Copiar al meu centre"

#### 4.2 Botó de còpia
- A `PlaylistCard` o `PlaylistEditor`: botó "Copiar" per llistes globals
- Modal de confirmació abans de copiar
- Després de copiar, redirigir a la llista copiada

---

## Fitxers a Crear

```
app/api/landing/playlist/route.ts       # API pública llista global
app/components/landing/LandingVideoPlayer.tsx  # Reproductor landing
app/pantalla/landing/page.tsx           # Display públic llista global
```

## Fitxers a Modificar

```
app/page.tsx                            # Landing page
app/api/playlists/[id]/route.ts         # Validació vídeos compartits
app/api/playlists/[id]/copy/route.ts    # Permisos còpia
app/components/playlists/PlaylistList.tsx  # Botó còpia
app/components/playlists/PlaylistCard.tsx  # Indicador llista global
app/llistes/[id]/editar/page.tsx        # Mode lectura per no-admins
```

---

## Criteris d'Acceptació

- [ ] Landing page mostra reproductor de vídeo 16:9 amb la llista global
- [ ] Vídeos es reprodueixen en autoplay (muted) amb loop infinit
- [ ] Botó "Ampliar" obre la llista global a pantalla completa en nova pestanya
- [ ] Només admin_global pot editar la llista global
- [ ] editor_profe pot copiar la llista global al seu centre
- [ ] No es poden afegir vídeos no compartits a la llista global
- [ ] La pàgina `/pantalla/landing` funciona sense autenticació

---

## Test Manual

1. Accedir a la landing page (sense login)
2. Verificar que el reproductor mostra vídeos de la llista global
3. Verificar autoplay i loop
4. Clicar "Ampliar" i verificar que s'obre pantalla completa
5. Com admin_global: editar llista global, afegir vídeo compartit ✓
6. Com admin_global: intentar afegir vídeo no compartit → error ✓
7. Com editor_profe: copiar llista global al centre ✓
8. Verificar que la còpia és independent de l'original

---

## Dependències

- ✅ M4: Sistema de llistes funcional
- ✅ M6: DisplayScreen i reproducció de vídeos
- ✅ Llista global existent (`global_prova`)
