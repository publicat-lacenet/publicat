# Problemes detectats en M6 - Pantalla Display

**Data:** 21 de gener de 2026  
**Estat:** Pendent de resolució

---

## Problema 1: Error "vimeo.com/... was not found" quan s'entra com a display

### Descripció
Quan un usuari amb rol `display` entra a `/pantalla`, el vídeo no es reprodueix i apareixen errors de runtime:
```
"https://vimeo.com/1156841645" was not found.
"https://vimeo.com/1156459725" was not found.
```
La pantalla mostra el títol del vídeo ("L'esmalt de les dents") però l'àrea de vídeo queda en negre.

### Captures
- Es veu la interfície de 3 zones (vídeo principal, anunci, RSS "Sense notícies")
- El títol del vídeo apareix a la part inferior esquerra
- L'error surt des de `xhr.onload` a `node_modules_fb48b184._.js`

### Causa probable
El camp `vimeo_id` a la base de dades conté **URLs completes** (`https://vimeo.com/1156841645`) en lloc de només l'**ID numèric** (`1156841645`).

El component `VimeoPlayer.tsx` fa:
```typescript
// Línia 92
id: parseInt(vimeoId, 10)
```

Quan `vimeoId = "https://vimeo.com/1156841645"`:
- `parseInt("https://vimeo.com/1156841645", 10)` retorna `NaN`
- L'API de Vimeo no troba el vídeo perquè rep un ID invàlid

### Fitxers a revisar
1. **`app/components/display/VimeoPlayer.tsx`** (línia 92)
   - Cal afegir funció per extreure l'ID numèric d'una URL de Vimeo
   - Ja existeix `extractVimeoId()` a `lib/vimeo/utils.ts` que fa exactament això

2. **`app/api/display/playlist/[id]/route.ts`** (línies 93-107)
   - Normalitzar `vimeo_id` abans de retornar-lo
   - Assegurar que sempre sigui l'ID numèric, no la URL

3. **Base de dades - taula `videos`**
   - Verificar el valor de `vimeo_id` vs `vimeo_url`
   - Possible confusió en guardar la URL al camp `vimeo_id`

### Solució proposada
Afegir funció de normalització que extregui l'ID numèric:
```typescript
function extractNumericVimeoId(vimeoId: string): string {
  if (/^\d+$/.test(vimeoId)) return vimeoId;
  
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /vimeo\.com\/video\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];
  
  for (const pattern of patterns) {
    const match = vimeoId.match(pattern);
    if (match) return match[1];
  }
  
  return vimeoId;
}
```

Aplicar-la a:
- `VimeoPlayer.tsx` abans de `parseInt()`
- `app/api/display/playlist/[id]/route.ts` al mapejar els vídeos

---

## Problema 2: El Visor (usuaris profe/admin) mostra placeholder en lloc del contingut

### Descripció
Quan un usuari amb rol `editor_profe` o `admin_global` entra, és redirigit a `/visor`. Aquesta pàgina:
- Mostra correctament el menú lateral i la barra superior (AdminLayout)
- Però el contingut principal és un **placeholder** que diu "Visor en Desenvolupament"

### Captures
- Es veu el layout complet amb menú lateral (icones de visor, contingut, llistes, etc.)
- Es veu la barra superior amb "PUBLI*CAT", cerca, i "Editor Professor / Sortir"
- El contingut central diu "Aquesta pàgina s'implementarà al Milestone M6"

### Anàlisi
El fitxer `app/visor/page.tsx` conté:
```tsx
export default function VisorPage() {
  return (
    <AdminLayout>
      <Breadcrumb items={['Visor']} />
      <PageHeader title="Visor" ... />
      <div>Visor en Desenvolupament</div>  // PLACEHOLDER!
    </AdminLayout>
  );
}
```

**NO està implementat el visor real.** M6 especifica `/pantalla` per a displays, però no defineix clarament què ha de fer `/visor`.

### Possibles interpretacions
1. **`/visor` = preview de `/pantalla`**: Els editors haurien de veure el mateix que els displays però amb controls addicionals
2. **`/visor` = dashboard de gestió**: Pàgina diferent per gestionar què es mostra
3. **`/visor` no existeix a M6**: Caldria redirigir editors a `/pantalla` directament

### Fitxers a revisar
1. **`docs/milestones/M6-pantalla-display.md`**
   - Clarificar si `/visor` forma part de M6
   - Definir el propòsit de `/visor` vs `/pantalla`

2. **`app/visor/page.tsx`**
   - Implementar funcionalitat real o
   - Redirigir a `/pantalla` si és un preview

3. **`app/providers.tsx`** (línies 33-43)
   - Actualment redirigeix `editor_profe` i `admin_global` a `/visor`
   - Potser haurien d'anar a `/pantalla` amb permisos de preview

4. **`app/pantalla/page.tsx`**
   - Ja permet accés a `editor_profe` i `admin_global`
   - El `DisplayScreenWrapper` ja mostra controls segons el rol

### Solució proposada
**Opció A:** Redirigir editors a `/pantalla` en lloc de `/visor`
```typescript
// app/providers.tsx
if (profile?.role === 'admin_global' || profile?.role === 'editor_profe') {
  redirect('/pantalla'); // En lloc de '/visor'
}
```

**Opció B:** Implementar `/visor` com a vista embebuda de `/pantalla` dins de l'AdminLayout
```tsx
// app/visor/page.tsx
export default async function VisorPage() {
  return (
    <AdminLayout>
      <PageHeader title="Visor" />
      <div className="aspect-video w-full">
        <DisplayScreen centerId={centerId} role="preview" />
      </div>
    </AdminLayout>
  );
}
```

---

## Resum d'accions pendents

| # | Problema | Prioritat | Fitxers afectats |
|---|----------|-----------|------------------|
| 1 | Error Vimeo ID vs URL | 🔴 Alta | `VimeoPlayer.tsx`, `route.ts`, BD |
| 2 | Visor placeholder | 🟡 Mitjana | `visor/page.tsx`, `providers.tsx` |

---

## Notes per a l'agent Claude Code CLI

1. **Primer problema (Vimeo):**
   - La funció `extractVimeoId` ja existeix a `lib/vimeo/utils.ts`
   - Es pot reutilitzar o copiar la lògica
   - Cal aplicar-la a `VimeoPlayer.tsx` línia 92 i a l'API de playlist

2. **Segon problema (Visor):**
   - Consultar al usuari quin comportament vol per a `/visor`
   - Si ha de ser preview → redirigir a `/pantalla`
   - Si ha de ser dashboard → implementar nova funcionalitat

3. **Verificacions addicionals:**
   - Comprovar el valor real de `vimeo_id` a la BD (pot ser que s'estigui guardant `vimeo_url` al camp incorrecte)
   - Revisar el hook `useVimeoValidation.ts` per veure com es guarden les dades

4. **Test després dels canvis:**
   - Entrar com a `display` → ha de reproduir vídeos sense errors
   - Entrar com a `editor_profe` → ha de veure el visor que veu el display més el menú lateral i la barra superior, de forma que pugui navegar per les diferents pestanyes. També hauria de poder passar commutar d'aquesta vista a la vista que veu el display.

IMPORTANT: PLANIFICA BÉ AQUESTA VISTTA I PREGUNTA TOTA LA INFORMACIÓ. SI TENS DUBTES PREGUNTA I SI CAL EDITA ELS CANVIS NECESSARIS AL MILESTONE M6-pantalla-display.md

---


