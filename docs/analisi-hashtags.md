# Anàlisi de Problemes amb Hashtags

**Data:** 3 febrer 2026

---

## 1. Problema Detectat

Els hashtags a la base de dades s'estan guardant com a cadenes concatenades en lloc de hashtags individuals. Per exemple:

| El que es guarda (INCORRECTE) | El que hauria de ser (CORRECTE) |
|-------------------------------|--------------------------------|
| `calgravat #egipte #tutankamon` | `calgravat`, `egipte`, `tutankamon` (3 registres) |
| `calgravat #santjordi #dita  #amor` | `calgravat`, `santjordi`, `dita`, `amor` (4 registres) |
| `palestiba #gaza #solidaritat` | `palestina`, `gaza`, `solidaritat` (3 registres) |
| `@calgravat #festuc` | `calgravat`, `festuc` (2 registres) |

Dels 52 hashtags actuals a la BD, **30 són malformats** (contenen espais o `#` dins del nom).

---

## 2. Causa Arrel

El problema és al **flux de parsing** del camp `HashtagInput`. L'usuari escriu els hashtags de diverses maneres que el sistema no gestiona correctament.

### Flux actual (amb el bug)

**1. L'usuari escriu al camp:**
```
calgravat #egipte #tutankamon
```

**2. `HashtagInput` separa per comes** (`,`):
```javascript
value.split(',') → ["calgravat #egipte #tutankamon"]  // 1 sol element!
```
Com no hi ha comes, tot el text es tracta com un sol hashtag.

**3. `VideoFormModal` afegeix `#` i envia a l'API:**
```
"#calgravat #egipte #tutankamon"
```

**4. L'API (`POST /api/videos`) fa:**
```javascript
hashtag_names.split(',')           // ["#calgravat #egipte #tutankamon"]
  .map(h => h.trim().toLowerCase()) // ["#calgravat #egipte #tutankamon"]
  .filter(h => h.startsWith('#'))   // ["#calgravat #egipte #tutankamon"]
  .map(h => h.slice(1))             // ["calgravat #egipte #tutankamon"]
```
Resultat: es crea UN hashtag amb nom `calgravat #egipte #tutankamon`.

### El problema clau

El sistema **només separa per comes** (`,`), però els usuaris escriuen hashtags separats per **espais** o amb **`#` com a separador**. Exemples reals d'input de l'usuari:

- `calgravat #egipte #tutankamon` (espai + # com separador)
- `@calgravat #festuc` (@ en lloc de #)
- `calgravat, bondia` (correcte amb comes, funciona bé)

---

## 3. Estat Actual de la Base de Dades

### Centre "LaceNet" (9366a258...)

| Hashtag | Videos | Estat |
|---------|--------|-------|
| `calgravat` | 39 | OK |
| `25n` | 2 | OK |
| `bondia` | 1 | OK |
| `català` | 1 | OK |
| `egipte` | 1 | OK |
| `esport` | 0 | OK (orfre) |
| `felicitat` | 1 | OK |
| `ia` | 3 | OK |
| `març` | 2 | OK |
| `palestina` | 1 | OK |
| `primavera` | 2 | OK |
| `tutankamon` | 1 | OK |
| `calgravat #25n` | 0 | MALFORMAT + orfre |
| `calgravat #abril` | 1 | MALFORMAT |
| `calgravat #alfabetització` | 1 | MALFORMAT |
| `calgravat #bondia` | 0 | MALFORMAT + orfre |
| `calgravat #bonnadal` | 0 | MALFORMAT + orfre |
| `calgravat #català` | 0 | MALFORMAT + orfre |
| `calgravat #diamundial #enfermetatsrares` | 1 | MALFORMAT |
| `calgravat #egipte #tutankamon` | 0 | MALFORMAT + orfre |
| `calgravat #felicitat` | 0 | MALFORMAT + orfre |
| `calgravat #franquisme #feixisme` | 0 | MALFORMAT + orfre |
| `calgravat #histories familiars` | 0 | MALFORMAT + orfre |
| `calgravat #març` | 1 | MALFORMAT |
| `calgravat #matematiques #pi` | 1 | MALFORMAT |
| `calgravat #motivació` | 1 | MALFORMAT |
| `calgravat #notícies` | 0 | MALFORMAT + orfre |
| `calgravat #octubre` | 1 | MALFORMAT |
| `calgravat #palestina` | 1 | MALFORMAT |
| `calgravat #primavera` | 0 | MALFORMAT + orfre |
| `calgravat #santjordi #dita  #amor` | 1 | MALFORMAT |
| `calgravat #setembre` | 1 | MALFORMAT |
| `calgravat #tardor` | 1 | MALFORMAT |
| `calgravat #tardor #bolets` | 1 | MALFORMAT |
| `calgravat #teatre #cultura` | 1 | MALFORMAT |
| `egipte #museucaire` | 1 | MALFORMAT |
| `homecoming #calgravat` | 0 | MALFORMAT + orfre |
| `primavera #dites` | 1 | MALFORMAT |
| `setembre #ariadna` | 0 | MALFORMAT + orfre |
| `@calgravat #festuc` | 1 | MALFORMAT (@ en lloc de #) |

### Centre "Institut Cal Gravat" (7a8cce85...)

| Hashtag | Videos | Estat |
|---------|--------|-------|
| `aniversaris` | 1 | OK |
| `calgravat` | 1 | OK |
| `calgravat #aniversaris #promició2025` | 1 | MALFORMAT |
| `calgravat #art #exposició` | 1 | MALFORMAT |
| `calgravat #colònies #porqueres` | 1 | MALFORMAT |
| `calgravat #portes obertes` | 1 | MALFORMAT |
| `dron #portesobertes` | 1 | MALFORMAT |
| `maitines #calgravat` | 2 | MALFORMAT |
| `palestiba #gaza #solidaritat` | 1 | MALFORMAT (typo "palestiba") |
| `quantaguerra #periodismedigital #primer any` | 1 | MALFORMAT |
| `recapte #granrecapte` | 1 | MALFORMAT |
| `socials #calgravat #memòria històrica` | 1 | MALFORMAT |

---

## 4. Problemes Secundaris

### 4.1 Hashtags orfes (0 vídeos associats)
Hi ha **13 hashtags** sense cap vídeo associat. Això passa perquè:
- El PATCH de vídeos esborra els `video_hashtags` i en crea de nous, però no esborra el hashtag de la taula `hashtags` si ja no té cap vídeo.
- Els hashtags malformats es van crear una vegada i van quedar orfes quan el vídeo es va reeditar.

### 4.2 Duplicats semàntics
El mateix concepte apareix com a hashtags separats:
- `calgravat` (39 vídeos) + `calgravat #25n` (0), `calgravat #bondia` (0), etc.
- `primavera` (2) + `calgravat #primavera` (0)
- `març` (2) + `calgravat #març` (1)
- `palestina` (1) + `calgravat #palestina` (1)

### 4.3 L'input no valida el format
- Accepta `@` com a prefix (`@calgravat #festuc`)
- Accepta espais dins del nom (`histories familiars`, `portes obertes`, `memòria històrica`)
- No normalitza: `palestiba` vs `palestina` (error tipogràfic)

---

## 5. Solució Proposada

### 5.1 Fix del parsing (codi)

Canviar el separador de **només comes** a **comes, espais i `#`**. La lògica ha de ser:

```
Input: "calgravat #egipte #tutankamon"
  → Split per comes, espais i # → ["calgravat", "egipte", "tutankamon"]
  → Normalitzar (lowercase, trim, eliminar @)
  → Filtrar buits
  → 3 hashtags individuals
```

**Fitxers a modificar:**
1. `app/components/videos/HashtagInput.tsx` — parsing per visualització de chips
2. `app/components/videos/VideoFormModal.tsx` — processament abans d'enviar
3. `app/api/videos/route.ts` (POST) — parsing al guardar
4. `app/api/videos/[id]/route.ts` (PATCH) — parsing al actualitzar

### 5.2 Neteja de la BD

Esborrar tots els hashtags i video_hashtags actuals, i reconstruir-los a partir dels vídeos existents amb el parsing corregit **no és viable** perquè el text original de l'input de l'usuari no es guarda enlloc. Un cop parsejat i guardat, la informació original es perd.

**Opció recomanada:** Migració SQL que:
1. Identifiqui hashtags malformats (contenen `#` o `@` dins del nom)
2. Els divideixi en hashtags individuals
3. Actualitzi les relacions `video_hashtags` per apuntar als nous hashtags
4. Elimini els hashtags malformats originals i els orfes sense vídeos

### 5.3 Millores addicionals al HashtagInput

- Mostrar instruccions clares: "Separar amb comes: `esports, ciències, cultura`"
- Validar en temps real: rebutjar caràcters `#` i `@` dins de l'input
- Opció futura: convertir a selector de hashtags existents (com TagSelector) en lloc de text lliure
