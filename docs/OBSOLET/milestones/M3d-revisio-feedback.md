# M3d — Sistema de Feedback i Revisió de Vídeos

**Data de planificació:** 2026-02-27
**Estat:** Planificació (pendent d'implementació)
**Prerequisit:** M3c (sistema de moderació) — completat

---

## Resum de la funcionalitat

Quan un professor rebutja un vídeo d'un alumne, pot escriure un comentari explicant els errors. El vídeo entra en un estat "necessita revisió" i **no s'elimina**. L'alumne veu la notificació, llegeix el comentari i pot corregir el vídeo (editar metadades i/o substituir el fitxer de Vimeo per un de nou). Un cop corregit, el vídeo torna al flux normal d'aprovació.

---

## Flux complet

```
[Professor veu vídeo pendent]
        │
        ├── "Demanar revisió" ──► Modal amb camp de comentari
        │       │
        │       └── Confirmar ──► status = needs_revision
        │                         rejection_comment = "..."
        │                         Notificació → alumne
        │
        └── "Eliminar" ──► Elimina definitivament (flux existent)


[Alumne obre /contingut]
        │
        ├── Badge vermell al sidebar ("Contingut" té notificació)
        └── Banner d'avís a la pàgina
                │
                └── Vídeo amb badge "Necessita revisió" (vermell)
                    + Comentari del professor visible a la card
                    + Botó "Corregir"
                            │
                            └── Obre VideoFormModal en mode edició
                                - Pot editar: títol, descripció, hashtags
                                - Pot substituir el vídeo (puja nou a Vimeo,
                                  s'elimina l'anterior de Vimeo)
                                - En confirmar: status → pending_approval
                                  rejection_comment → null


[Professor veu vídeo pendent (2a ronda)]
        │
        ├── Aprova ──► published
        └── Demanar revisió ──► needs_revision (sobreescriu comentari anterior)
```

---

## Decisions de disseny

| Decisió | Opció triada | Raó |
|---------|-------------|------|
| Estat intermedi | `needs_revision` (nou estat) | Semàntica clara, diferent de `pending_approval` |
| Comentaris | Només l'últim comentari | Simplicitat; no cal historial |
| Vídeo Vimeo en re-puja | Eliminar l'anterior de Vimeo | Evitar acumulació de vídeos inútils |
| Rebuig definitiu | El professor continua tenint "Eliminar" | Distingeix "millora possible" de "rebuig total" |
| Notificació UI | Badge al sidebar + Banner a /contingut | No email de moment |
| Camps editables alumne | Tots (títol, descripció, hashtags, vídeo) | Control total per corregir qualsevol error |

---

## Canvis a la base de dades

### 1. Ampliar l'enum de status

```sql
-- Afegir el nou valor a l'enum existent
ALTER TYPE video_status ADD VALUE 'needs_revision';
```

### 2. Noves columnes a la taula `videos`

```sql
ALTER TABLE videos
  ADD COLUMN rejection_comment TEXT,
  ADD COLUMN rejected_at TIMESTAMPTZ,
  ADD COLUMN rejected_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
```

### 3. Actualitzar RLS per a `editor_alumne`

Actualment `editor_alumne` té RLS bloquejant UPDATE. Cal afegir excepció per vídeos propis en `needs_revision`:

```sql
-- Política UPDATE per editor_alumne (vídeos propis en needs_revision)
CREATE POLICY "editor_alumne_update_own_needs_revision"
  ON videos FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'editor_alumne'
    )
    AND uploaded_by_user_id = auth.uid()
    AND status = 'needs_revision'
  );
```

### 4. Trigger: notificació quan un vídeo entra a `needs_revision`

```sql
CREATE OR REPLACE FUNCTION notify_video_needs_revision()
RETURNS TRIGGER AS $$
BEGIN
  -- Quan status canvia a needs_revision
  IF OLD.status = 'pending_approval' AND NEW.status = 'needs_revision' THEN
    INSERT INTO notifications (user_id, type, title, message, video_id, actor_user_id)
    VALUES (
      NEW.uploaded_by_user_id,
      'video_needs_revision',
      'El teu vídeo necessita revisió',
      'El professor ha demanat canvis al vídeo "' || NEW.title || '".',
      NEW.id,
      NEW.rejected_by_user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_video_needs_revision
  AFTER UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION notify_video_needs_revision();
```

### 5. Actualitzar tipus de notificació

La taula `notifications` té una restricció de tipus. Cal afegir `video_needs_revision`:

```sql
-- Si hi ha un CHECK constraint al tipus:
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('video_pending', 'video_approved', 'video_rejected', 'video_needs_revision'));
```

---

## Canvis a l'API

### `PATCH /api/videos/[id]` — ampliar casos

**Cas 1: Professor demana revisió**
```typescript
// body: { action: 'request_revision', rejection_comment: '...' }
// Rol requerit: editor_profe o admin_global
// Vídeo ha d'estar en: pending_approval

updates = {
  status: 'needs_revision',
  rejection_comment: body.rejection_comment,
  rejected_at: new Date().toISOString(),
  rejected_by_user_id: user.id,
};
// La notificació la crea el trigger de la BD automàticament
```

**Cas 2: Alumne envia correcció**
```typescript
// body: { action: 'submit_revision', title?, description?, hashtags?,
//          vimeo_id?, vimeo_hash?, vimeo_url?, frames_urls? }
// Rol requerit: editor_alumne
// Condicions: vídeo és propi + status = needs_revision

// Si hi ha nou vimeo_id diferent de l'anterior → eliminar vídeo antic de Vimeo
if (body.vimeo_id && body.vimeo_id !== video.vimeo_id) {
  await deleteVimeoVideo(video.vimeo_id);
}

updates = {
  ...campsEditats,
  status: 'pending_approval',
  rejection_comment: null,
  rejected_at: null,
  rejected_by_user_id: null,
};
```

### Nou endpoint: `GET /api/notifications`

```typescript
// Retorna notificacions no llegides de l'usuari actual
// Suporta filtre: ?type=video_needs_revision
// Retorna: { notifications: [...], unread_count: number }
```

### Nou endpoint: `PATCH /api/notifications/[id]`

```typescript
// body: { is_read: true }
// Marca una notificació com a llegida
```

### Eliminació de vídeo de Vimeo (`lib/vimeo/api.ts`)

Afegir funció nova:
```typescript
export async function deleteVimeoVideo(vimeoId: string): Promise<void>
// Fa DELETE a https://api.vimeo.com/videos/{vimeoId}
// Ignora errors 404 (ja eliminat)
// Llança error per altres falles
```

---

## Canvis a components i pàgines

### Nous components

#### `app/components/videos/RejectionCommentModal.tsx`
Modal que obre el professor per escriure el comentari de revisió.

```
┌────────────────────────────────────────┐
│  Demanar revisió del vídeo             │
│  "Títol del vídeo"                     │
├────────────────────────────────────────┤
│  Comentari per a l'alumne:             │
│  ┌──────────────────────────────────┐  │
│  │ La qualitat d'àudio és massa     │  │
│  │ baixa. Torna a gravar...         │  │
│  └──────────────────────────────────┘  │
│  (mínim 10 caràcters)                  │
│                                        │
│         [Cancel·lar] [Demanar revisió] │
└────────────────────────────────────────┘
```

#### `app/components/ui/NotificationDot.tsx`
Component petit (punt vermell amb número) per afegir al sidebar.

### Components modificats

#### `app/components/videos/VideoCard.tsx`

**Canvis per a `editor_profe` (vídeos pendents):**
- Reemplaçar el botó d'"Eliminar" per **dos botons** quan el vídeo és `pending_approval`:
  - `Demanar revisió` (groc/taronja) → obre `RejectionCommentModal`
  - `Eliminar` (vermell) → comportament existent
- Mantenir el botó "Aprovar" (verd)

**Canvis per a `editor_alumne` (vídeos propis en `needs_revision`):**
- Badge "Necessita revisió" (vermell) en lloc de "Pendent" (groc)
- Mostrar el comentari del professor dins la card:
  ```
  ┌─ Comentari del professor ──────────────┐
  │ "La qualitat d'àudio és massa baixa..."│
  └────────────────────────────────────────┘
  ```
- Botó "Corregir" que obre el `VideoFormModal` en mode edició

#### `app/components/videos/VideoFormModal.tsx`

Afegir suport per a mode edició de l'alumne en vídeos `needs_revision`:
- Mostrar camp de re-puja de vídeo (VideoUploader) com a opcional
- Si l'alumne puja un nou vídeo, es substitueix l'anterior
- El text del botó de submit canvia: "Enviar per revisió" en lloc de "Desar"
- En confirmar: crida PATCH amb `action: 'submit_revision'`

#### `app/components/layout/AppSidebar.tsx`

Afegir `NotificationDot` a l'ítem "Contingut" del sidebar:
- Visible per a `editor_alumne` quan té vídeos en `needs_revision` no llegits
- Crida `GET /api/notifications?type=video_needs_revision&unread=true` en carregar
- Actualitza cada 60 segons (polling simple, sense Realtime de moment)

#### `app/contingut/page.tsx`

Afegir banner d'avís per a `editor_alumne`:
```
┌────────────────────────────────────────────────────────┐
│ ⚠  Tens 2 vídeos que necessiten revisió. El professor  │
│    ha deixat comentaris. Revisa'ls a continuació.      │
└────────────────────────────────────────────────────────┘
```
- Visible només per a `editor_alumne` quan té vídeos en `needs_revision`
- Es calcula a partir de les dades de vídeos ja carregades (no cal crida extra)
- El banner desapareix quan tots els vídeos `needs_revision` es corregeixen

---

## Fitxers afectats (llista completa)

### Nous fitxers
```
supabase/migrations/20260227100000_m3d_revision_feedback.sql
app/api/notifications/route.ts
app/api/notifications/[id]/route.ts
app/components/videos/RejectionCommentModal.tsx
app/components/ui/NotificationDot.tsx
docs/milestones/M3d-revisio-feedback.md  ← (aquest fitxer)
```

### Fitxers modificats
```
app/api/videos/[id]/route.ts          — Nous casos d'acció al PATCH
lib/vimeo/api.ts                      — Nova funció deleteVimeoVideo()
app/components/videos/VideoCard.tsx   — Nous botons i estat needs_revision
app/components/videos/VideoFormModal.tsx — Suport edició alumne
app/components/layout/AppSidebar.tsx  — Badge de notificació
app/contingut/page.tsx                — Banner d'avís + gestió estat needs_revision
```

---

## Ordre d'implementació recomanat

### Fase 1 — Base de dades (prerequisit tot)
1. Crear migració SQL amb tots els canvis de BD
2. Aplicar via Supabase SQL Editor
3. Verificar que l'enum, columnes, RLS i trigger funcionen correctament

### Fase 2 — API backend
4. Afegir funció `deleteVimeoVideo()` a `lib/vimeo/api.ts`
5. Ampliar `PATCH /api/videos/[id]` amb els dos nous casos
6. Crear `GET /api/notifications` i `PATCH /api/notifications/[id]`

### Fase 3 — UI professor (el que veu primer)
7. Crear `RejectionCommentModal.tsx`
8. Modificar `VideoCard.tsx` per als botons del professor (pending → dos botons)

### Fase 4 — UI alumne (el que rep el feedback)
9. Afegir badge `needs_revision` i comentari visible a `VideoCard.tsx`
10. Modificar `VideoFormModal.tsx` per permetre edició en `needs_revision`
11. Afegir banner a `/contingut`

### Fase 5 — Notificació al sidebar
12. Crear `NotificationDot.tsx`
13. Integrar badge a `AppSidebar.tsx` amb polling

### Fase 6 — Proves i ajustos
14. Provar flux complet: alumne puja → professor demana revisió → alumne corregeix → professor aprova
15. Provar re-puja de vídeo amb eliminació de l'anterior de Vimeo
16. Provar múltiples rondes de revisió
17. Verificar RLS (alumne no pot editar vídeos d'altri o en `pending_approval`)

---

## Consideracions tècniques

### Eliminació de vídeo de Vimeo
- L'API de Vimeo permet `DELETE /videos/{vimeo_id}` si el token té scope `delete`
- Cal verificar que el token `VIMEO_ACCESS_TOKEN` té el scope necessari
- Si no té el scope, l'eliminació fallen silenciosament (log d'error, no bloqueig)
- **Acció prèvia**: verificar els scopes del token actual a `VIMEO_ACCESS_TOKEN`

### Polling de notificacions al sidebar
- El sidebar fa polling cada 60s cridant `/api/notifications?unread=true`
- No usem Supabase Realtime de moment per simplicitat
- El polling s'atura quan l'usuari tanca la sessió

### Validació del comentari de revisió
- Mínim 10 caràcters (per evitar comentaris buids o trivials)
- Màxim 1000 caràcters
- El camp és obligatori per enviar la petició de revisió

### Seguretat
- RLS assegura que `editor_alumne` només pot actualitzar vídeos propis en `needs_revision`
- L'API valida adicionalment que l'acció i els camps coincideixen amb el rol
- L'alumne no pot canviar l'estat directament; el PATCH `submit_revision` el canvia internament
- El professor no pot marcar com `needs_revision` un vídeo ja `published` (validació a l'API)

---

## Canvis visuals de referència

### VideoCard — vista professor (vídeo pendent)
```
┌────────────────────────────────────────┐
│  [thumbnail]                           │
│  Títol del vídeo                    ⏳ Pendent
│  Descripció breu...                    │
│  ──────────────────────────────────── │
│  [▶ Veure] [✓ Aprovar] [↩ Revisió] [✕]│
└────────────────────────────────────────┘
                              ↑         ↑
                        (groc/taronja) (vermell)
                        Obre modal    Elimina
```

### VideoCard — vista alumne (vídeo en revisió)
```
┌────────────────────────────────────────┐
│  [thumbnail]                           │
│  Títol del vídeo                 🔴 Necessita revisió
│  ──────────────────────────────────── │
│  💬 Comentari del professor:           │
│  "La qualitat d'àudio és massa baixa.  │
│   Torna a gravar en un lloc silenciós."│
│  ──────────────────────────────────── │
│              [▶ Veure] [✏ Corregir]   │
└────────────────────────────────────────┘
```

### Sidebar — amb badge de notificació
```
  📁 Contingut  ●   ← punt vermell quan hi ha needs_revision no llegits
  📋 Llistes
  📺 Visor
  ...
```

---

## Fora d'abast (per a futures iteracions)

- Historial de comentaris de revisió (totes les rondes)
- Notificacions per email
- Notificacions en temps real (Supabase Realtime)
- Límit de temps per corregir un vídeo
- Estadístiques de vídeos revisats per centre
