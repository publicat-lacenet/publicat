# M3c: Moderació Alumnes - IMPLEMENTAT ✅

**Data d'implementació:** 2026-01-12  
**Estat:** ✅ Completat i funcional  
**Dependències:** M3a (Contingut Base), M3b (Vimeo Upload Direct)

---

## 📋 Resum de la Implementació SIMPLIFICADA

S'ha implementat un sistema **simplificat** de moderació de vídeos que permet:

1. **Editor-alumne** pot pujar vídeos que queden automàticament amb `status = 'pending_approval'`
2. **Editor-profe** veu tots els vídeos (pendents i publicats) a la pàgina `/contingut`
3. **Editor-profe** pot **editar** videos pendientes abans d'aprovar-los
4. **Editor-profe** pot **aprovar** vídeos amb un botó a la targeta del vídeo
5. **Editor-profe** pot **rebutjar** (eliminar) vídeos pendents
6. Els vídeos pendents es mostren amb **badge groc "⏳ Pendent"** per identificació visual
7. El sistema utilitza triggers SQL per notificacions a la taula `notifications` (UI pendiente de implementar)

**NO s'ha implementat:**
- ❌ Página `/moderacio` separada (todo se gestiona desde `/contingut`)
- ❌ Sistema de notificaciones in-app complejo (NotificationBadge, dropdowns, etc.)
- ❌ Realtime subscriptions para notificaciones
- ❌ Solo se usan iconos/colores para identificar videos pendientes

---

## ✅ Fitxers Implementats

### 1. **Migració SQL**
📄 [supabase/migrations/20260112120000_m3c_moderation_system.sql](../../supabase/migrations/20260112120000_m3c_moderation_system.sql)

**Contingut:**
- ✅ Triggers per notificacions automàtiques (registres a BD):
  - `notify_pending_video()` - Crea registre quan alumne puja vídeo
  - `notify_video_approved()` - Crea registre quan s'aprova el vídeo
  - `notify_video_rejected()` - Crea registre quan es rebutja el vídeo
- ✅ RLS Policies per Editor-alumne:
  - Permetre crear vídeos (queden `pending_approval`)
  - Veure els seus propis vídeos pendents + tots els publicats del centre
  - **NO** pot editar ni esborrar vídeos
- ✅ RLS Policies per Editor-profe:
  - Veure **TOTS** els vídeos del centre (pending + published)
  - **Editar** qualsevol vídeo (incluent pendents)
  - Aprovar vídeos (UPDATE status → `published`)
  - Esborrar vídeos (rebutjar)
- ✅ Índexs optimitzats per consultes ràpides

**Correccions realitzades:**
- ✅ `uploaded_by_user_id` (camp correcte de la taula videos)
- ✅ Consultes simples amb EXISTS per evitar recursió infinita
- ✅ `onboarding_status = 'active'` (camp correcte de la taula users)

---

### 2. **Component VideoCard (actualitzat)**
📄 [app/components/videos/VideoCard.tsx](../../app/components/videos/VideoCard.tsx)

**Canvis implementats:**
- ✅ Badge groc "⏳ Pendent" per vídeos amb `status = 'pending_approval'`
- ✅ Botó **"✓ Aprovar"** (verd) visible només per editor-profe en vídeos pendents
- ✅ Botó **"✏️ Editar"** funcional per **tots** els vídeos (no solo publicados)
- ✅ Botó **"✕ Rebutjar"** (eliminar) per vídeos pendents
- ✅ Props `onApprove` per gestionar aprovació des del pare

**Codi rellevant:**
```tsx
{/* Badge de estat */}
{video.status === 'pending_approval' && (
  <span className="px-2 py-1 rounded-md text-xs font-semibold bg-yellow-500 text-white">
    ⏳ Pendent
  </span>
)}

{/* Botó Aprovar - Només per vídeos pendents */}
{onApprove && video.status === 'pending_approval' && (
  <button onClick={() => onApprove(video)} className="...bg-green-600...">
    ✓ Aprovar
  </button>
)}

{/* Botó Editar - Tots els vídeos */}
{onEdit && (
  <button onClick={() => onEdit(video)}>
    ✏️
  </button>
)}
```

---

### 3. **Pàgina Contingut (actualitzada)**
📄 [app/contingut/page.tsx](../../app/contingut/page.tsx)

**Funcionalitat implementada:**
- ✅ **Filtre d'estat** per editor-profe i admin-global:
  - "Tots els estats"
  - "Publicats" 
  - "Pendents d'aprovació"
- ✅ Paràmetre URL `?status=pending` per accés directe a vídeos pendents
- ✅ Funció `handleApprove()` per aprovar vídeos:
  ```tsx
  const handleApprove = async (video: Video) => {
    const res = await fetch(`/api/videos/${video.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'published' }),
    });
  };
  ```
- ✅ Passa `onApprove` al component VideoGrid només per editor-profe i admin-global
- ✅ Refetch automàtic després d'aprovar/rebutjar

---

## 🎯 Workflow Implementat

```
┌─────────────────────────────────────────────────────────────┐
│  Editor-alumne puja vídeo des de /contingut                 │
│  (Formulari amb Vimeo Direct Upload)                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Vídeo guardat automàticament amb:                           │
│  - status = 'pending_approval'                               │
│  - is_shared_with_other_centers = false                      │
│  - uploaded_by_user_id = auth.uid()                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Trigger SQL: notify_pending_video()                         │
│  Crea registre a taula notifications per editor-profe        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Editor-profe accedeix /contingut?status=pending             │
│  Veu targetes de vídeos amb:                                 │
│  - Badge groc "⏳ Pendent"                                   │
│  - Botó verd "✓ Aprovar"                                    │
│  - Botó "✏️ Editar" (pot editar abans d'aprovar)            │
│  - Botó "✕" Rebutjar (eliminar)                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Editor-profe APROVA el vídeo                                │
│  - Clica botó "✓ Aprovar"                                   │
│  - status → 'published'                                      │
│  - Trigger notify_video_approved() crea notificació         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Vídeo visible per TOTHOM al centre                          │
│  - Apareix en llistats normals                               │
│  - Es pot afegir a playlists                                 │
│  - Editor-alumne veu el seu vídeo publicat                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Checklist de Funcionalitat

### ✅ Permisos i Rols
- [x] Editor-alumne pot crear vídeos (queden `pending_approval`)
- [x] Editor-alumne veu els seus vídeos pendents + tots els publicats
- [x] Editor-alumne **NO** pot editar ni esborrar vídeos
- [x] Editor-profe veu TOTS els vídeos del centre (pending + published)
- [x] Editor-profe pot editar **tots** els vídeos (incloent pendents)
- [x] Editor-profe pot aprovar vídeos (canvi status → published)
- [x] Editor-profe pot rebutjar vídeos (DELETE)

### ✅ UI/UX
- [x] Badge groc "⏳ Pendent" visible en vídeos pendents
- [x] Botó verd "✓ Aprovar" només visible per editor-profe en vídeos pendents
- [x] Botó "✏️ Editar" funcional per tots els vídeos
- [x] Botó "✕" per rebutjar/eliminar amb confirmació
- [x] Filtre d'estat a /contingut (Tots/Publicats/Pendents)
- [x] Refetch automàtic després d'accions

### ✅ Base de Dades
- [x] Taula `notifications` amb camps correctes
- [x] Trigger `notify_pending_video()` funcional
- [x] Trigger `notify_video_approved()` funcional  
- [x] Trigger `notify_video_rejected()` funcional
- [x] RLS policies per editor-alumne correctes
- [x] RLS policies per editor-profe correctes
- [x] Índexs optimitzats

### ⏳ Pendent Implementació Futura
- [ ] UI per visualitzar notificacions (actualment només BD)
- [ ] Sistema de notificacions in-app amb badge i dropdown
- [ ] Supabase Realtime per actualitzacions en temps real
- [ ] Pàgina `/moderacio` dedicada (opcional)

---

## 🧪 Testing Manual

### Test 1: Alumne puja vídeo
1. Login com a **editor-alumne**
2. Accedir a `/contingut`
3. Clicar "Pujar Vídeo"
4. Omplir formulari i guardar
5. ✅ **Verificar**: Vídeo apareix amb badge groc "⏳ Pendent"
6. ✅ **Verificar**: Alumne veu el seu vídeo pendent
7. ✅ **Verificar**: NO veu botons Editar/Eliminar

### Test 2: Profe aprova vídeo
1. Login com a **editor-profe**
2. Accedir a `/contingut?status=pending`
3. ✅ **Verificar**: Veu vídeos pendents del centre
4. ✅ **Verificar**: Veu botó verd "✓ Aprovar"
5. Opcional: Clicar "✏️ Editar" per modificar dades
6. Clicar "✓ Aprovar"
7. ✅ **Verificar**: Vídeo desapareix de la llista de pendents
8. Canviar filtre a "Publicats"
9. ✅ **Verificar**: Vídeo apareix sense badge "Pendent"

### Test 3: Profe rebutja vídeo
1. Login com a **editor-profe**
2. Accedir a `/contingut?status=pending`
3. Clicar botó "✕" en un vídeo pendent
4. ✅ **Verificar**: Apareix confirmació
5. Confirmar eliminació
6. ✅ **Verificar**: Vídeo s'elimina de la BD
7. ✅ **Verificar**: Es crea notificació de rebuig (comprovar BD)

### Test 4: Verificar triggers SQL
```sql
-- Comprovar notificacions creades
SELECT * FROM notifications 
WHERE type IN ('video_pending', 'video_approved', 'video_rejected')
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🚀 Deployment

### Pas 1: Migració SQL
```bash
# Aplicar migració
supabase db push

# Verificar aplicació
supabase db diff
```

### Pas 2: Verificar RLS Policies
```sql
-- Comprovar policies de videos
SELECT * FROM pg_policies WHERE tablename = 'videos';

-- Comprovar policies de notifications  
SELECT * FROM pg_policies WHERE tablename = 'notifications';
```

### Pas 3: Deploy Frontend
```bash
# Build i deploy
npm run build
vercel --prod
```

---

## 📚 Documentació Relacionada

- [Sistema de Moderació Complert](../moderation-system.md) - Documentació tècnica completa
- [M3c Milestone Original](M3c-moderacio-alumnes.md) - Especificació inicial del hito
- [RLS Policies](../database.schema.md) - Documentació de permisos
- [Triggers SQL](../database.schema.md#triggers) - Detall dels triggers

---

## ✅ Definition of Done

- [x] Editor-alumne pot crear vídeos (queden `pending_approval`)
- [x] Editor-profe veu tots els vídeos pendents a `/contingut?status=pending`
- [x] Editor-profe pot **editar** vídeos pendents abans d'aprovar-los
- [x] Editor-profe pot aprovar vídeos amb botó verd a la targeta
- [x] Editor-profe pot rebutjar vídeos (eliminar) amb confirmació
- [x] Badge groc "⏳ Pendent" visible en vídeos amb `status = 'pending_approval'`
- [x] Triggers SQL creen registres a taula `notifications`
- [x] RLS policies permeten accés correcte segons rol
- [x] Refetch automàtic després d'aprovar/rebutjar vídeos
- [x] Zero errors crítics en consola
- [x] Documentació completa i actualitzada
- [ ] UI de notificacions in-app (pendent implementació futura)
- [ ] Supabase Realtime per notificacions (pendent)

---

**Data de creació:** 7 gener 2026  
**Data actualització:** 12 gener 2026  
**Versió:** 2.0 (Simplificada)  
**Autor:** GitHub Copilot  
**Estat:** ✅ Funcional i desplegat

