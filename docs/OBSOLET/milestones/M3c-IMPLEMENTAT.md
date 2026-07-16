# M3c: Moderació Alumnes - IMPLEMENTAT ✅

**Data d'implementació:** 2026-01-12  
**Data de finalització:** 2026-01-12  
**Estat:** ✅ Completat, testat i desplegat  
**Dependències:** M3a (Contingut Base), M3b (Vimeo Upload Direct)

---

## 📋 Resum de la Implementació SIMPLIFICADA

S'ha implementat un sistema **simplificat** de moderació de vídeos que permet:

1. **Editor-alumne** pot pujar vídeos que queden automàticament amb `status = 'pending_approval'`
2. **Editor-profe** veu tots els vídeos (pendents i publicats) a la pàgina `/contingut`
3. **Editor-profe** pot **editar** vídeos pendents abans d'aprovar-los
4. **Editor-profe** pot **aprovar** vídeos amb un botó a la targeta del vídeo
5. **Editor-profe** pot **rebutjar** (eliminar) vídeos pendents
6. Els vídeos pendents es mostren amb **badge groc "⏳ Pendent"** per identificació visual
7. El sistema utilitza triggers SQL per notificacions a la taula `notifications`

**NO s'ha implementat:**
- ❌ Página `/moderacio` separada (tot es gestiona des de `/contingut`)
- ❌ Sistema de notificacions in-app complext (NotificationBadge, dropdowns, etc.)
- ❌ Realtime subscriptions per notificacions (pendent)
- ✅ Solo s'usen icones/colors per identificar vídeos pendents

---

## ✅ Correccions Realitzades en aquesta Sessió

### 1. **Rol d'usuari no es mostrava al header**
**Problema:** El rol apareixia com "Carregant..." i no es actualitzava
**Solució:**
- ✅ Crear `AuthContext.tsx` - Context de React per compartir estat de autenticació
- ✅ Crear `app/providers.tsx` - Wrapper de providers
- ✅ Envolver aplicació amb `AuthProvider` en `app/layout.tsx`
- ✅ Actualitzar `AppHeader.tsx` per mostrar rol correctament
- ✅ Netejar sessionStorage que tenia dades cacheades

### 2. **Vídeos d'alumnos es creaven com "published" en lloc de "pending_approval"**
**Problema:** Tots els vídeos es creaven amb `status = 'published'`
**Solució:**
- ✅ Actualitzar `/api/videos/route.ts` POST per establir `status` segons rol:
  - `editor_alumne` → `pending_approval`
  - `editor_profe` / `admin_global` → `published`
- ✅ Prioritzar rol de taula `users` sobre `user_metadata` de Supabase Auth

### 3. **Noms de taules i camps incorrectes**
**Problema:** Consultes feien referència a taules/camps no existents
**Solució:**
- ✅ Canviar `'centres'` → `'centers'` en totes les queries
- ✅ Canviar `slug` → `name` (amb ilike) en cerques de centres
- ✅ Canviar `active` → `is_active` per verificar centres actius
- ✅ Actualitzar:
  - `/api/auth/me/route.ts`
  - `/app/api/videos/[id]/route.ts`
  - `/app/api/videos/route.ts` (GET i POST)

---

## 📁 Fitxers Creats/Actualitzats en aquesta Sessió

### Nous fitxers:
- ✅ [utils/supabase/AuthContext.tsx](../../utils/supabase/AuthContext.tsx) - Context de autenticació global
- ✅ [app/providers.tsx](../../app/providers.tsx) - Provider wrapper
- ✅ [app/components/ui/alert.tsx](../../app/components/ui/alert.tsx) - Componente UI
- ✅ [app/components/ui/badge.tsx](../../app/components/ui/badge.tsx) - Componente UI
- ✅ [app/components/ui/card.tsx](../../app/components/ui/card.tsx) - Componente UI

### Fitxers modificats:
- ✅ [app/layout.tsx](../../app/layout.tsx) - Afegit Providers wrapper
- ✅ [app/components/layout/AppHeader.tsx](../../app/components/layout/AppHeader.tsx) - Mostrar rol correctament
- ✅ [app/api/auth/me/route.ts](../../app/api/auth/me/route.ts) - Prioritzar rol de DB
- ✅ [app/api/videos/route.ts](../../app/api/videos/route.ts) - Fix status per rol, noms de taules
- ✅ [app/api/videos/[id]/route.ts](../../app/api/videos/[id]/route.ts) - Fix noms de taules/camps

---

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

- [x] **Autenticació Global** - AuthProvider en nivel raíz
- [x] **Rol visible** - AppHeader mostra rol correctament (Editor Alumne / Editor Professor / Admin Global)
- [x] **Crear vídeos** - Editor-alumne pot pujar vídeos
- [x] **Status correcte** - Vídeos d'alumnos es creen amb `pending_approval`
- [x] **Veure pendents** - Editor-profe pot veure vídeos pendents a `/contingut?status=pending`
- [x] **Editar vídeos** - Editor-profe pot editar vídeos pendents
- [x] **Aprovar vídeos** - Editor-profe pot aprovar vídeos amb botó verd
- [x] **Rebutjar vídeos** - Editor-profe pot eliminar vídeos pendents
- [x] **Badge visual** - Vídeos pendents mostren badge groc "⏳ Pendent"
- [x] **Triggers SQL** - Sistema de notificacions creat a BD
- [x] **RLS policies** - Permisos d'accés correctes per rol
- [x] **Noms correctes** - Taules i camps de BD corregits (`centers`, `is_active`, `name`)
- [x] **Zero errors** - Console neta, sense errors crítics
- [x] **Testat** - Funcionalitat verificada manualment
- [x] **Desplegat** - Canvis subits a GitHub (commit 294e54d)
- [ ] **UI notificacions** - Component de notificacions in-app (futura)
- [ ] **Realtime** - Supabase Realtime per actualitzacions (futura)

---

**Data de creació:** 7 gener 2026  
**Data finalització:** 12 gener 2026  
**Versió:** 2.0 (Simplificada + Corregida)  
**Autor:** GitHub Copilot  
**Estat:** ✅ Funcional, testat i desplegat a producció

