# Milestone 6c: Gestió d'Usuaris del Centre

**Objectiu:** Permetre que Editor-profe gestioni els usuaris del seu centre (editor_profe, editor_alumne, display) des de `/usuaris`, reutilitzant els patrons existents de M2 (Admin Users).

**Dependències:** M2 completat (sistema invitació, UsersTab base), M1 (taula users amb RLS)
**Risc:** 🟢 Baix (reutilitza patrons existents de M2)
**Estat:** PENDENT

---

## 📋 Context

### Estat actual

**Què ja funciona:**
- `/admin` té un `UsersTab` complet (`app/admin/tabs/UsersTab.tsx`) que gestiona usuaris globalment — només accessible per `admin_global`
- API routes `GET/POST /api/admin/users` i `PATCH/DELETE /api/admin/users/[id]` existeixen, però requereixen `admin_global`
- API route `POST /api/admin/users/[id]/resend-invite` gestiona reenviament d'invitacions amb cooldown de 5 minuts
- La pàgina `/usuaris` existeix (`app/usuaris/page.tsx`) però és un placeholder que diu "Gestió d'Usuaris en Desenvolupament"
- El sidebar (`AppSidebar.tsx`) ja mostra l'entrada "Usuaris" per a `editor_profe` i `admin_global`
- El sistema d'invitació utilitza `supabase.auth.admin.inviteUserByEmail()` amb service role key
- La taula `users` té constraint: `(role = 'admin_global') OR (center_id IS NOT NULL)` — assegura que no-admins sempre tenen centre

**Què falta:**
- Noves API routes `/api/center/users/*` amb permisos per `editor_profe`
- Implementar la UI de `/usuaris` amb taula, filtres, crear/editar modal
- Validacions de seguretat: no deixar centre sense editor_profe, no editar-se un mateix
- Adaptar `admin_global` perquè també pugui usar `/usuaris` (veu usuaris del centre seleccionat)

### Patrons a reutilitzar

El `UsersTab.tsx` d'admin és el model directe. Les diferències principals són:

| Aspecte | Admin (M2) | Centre (M6c) |
|---------|-----------|-------------|
| Rols permesos al crear | 4 (admin_global, editor_profe, editor_alumne, display) | 3 (editor_profe, editor_alumne, display) |
| Centre | Selector de qualsevol centre | Auto-assignat al centre del professor |
| Filtre per centre | Sí (dropdown) | No (implícit, sempre el propi) |
| Visibilitat | Tots els usuaris del sistema | Només usuaris del propi centre |
| API | `/api/admin/users` | `/api/center/users` |

---

## 🎯 Criteris d'Acceptació

### Pàgina `/usuaris`
- [ ] Taula d'usuaris del centre actual amb columnes: Email, Nom, Rol, Estat, Onboarding, Accions
- [ ] Cerca per email o nom
- [ ] Filtre per rol (editor_profe, editor_alumne, display)
- [ ] Filtre per estat (actiu/inactiu)
- [ ] Botó "Crear Usuari" obre modal

### Crear usuari
- [ ] Modal amb camps: Email*, Nom complet*, Rol* (3 opcions)
- [ ] `center_id` assignat automàticament al centre del professor (no visible al formulari)
- [ ] Invitació per email automàtica (reutilitza `inviteUserByEmail`)
- [ ] Validació: email únic al sistema
- [ ] Missatge d'info: "S'enviarà un email d'invitació"

### Editar usuari
- [ ] Modal amb camps: Nom complet, Rol (canviable), Estat actiu/inactiu
- [ ] Email no editable (mostrat com disabled)
- [ ] Restricció: no pot canviar el seu propi rol
- [ ] Restricció: no pot desactivar-se a ell mateix

### Reenviar invitació
- [ ] Botó visible per usuaris amb `onboarding_status = 'invited'`
- [ ] Cooldown de 5 minuts entre reenviaments
- [ ] Confirmació abans d'enviar

### Seguretat
- [ ] Editor-profe NOMÉS veu i gestiona usuaris del seu centre
- [ ] No pot crear `admin_global` (opció no disponible al selector de rol)
- [ ] No pot deixar el centre sense cap `editor_profe` actiu (validació server-side al desactivar o canviar rol)
- [ ] Admin_global també pot accedir a `/usuaris` (veu usuaris del seu centre assignat)
- [ ] API routes validen permisos server-side (rol + centre)

---

## 🏗️ Arquitectura

### API routes noves

```
app/api/center/users/
├── route.ts                    # GET (llistar) + POST (crear)
└── [id]/
    ├── route.ts                # PATCH (editar)
    └── resend-invite/
        └── route.ts            # POST (reenviar invitació)
```

### Fitxers a modificar

```
app/usuaris/page.tsx            # Substituir placeholder per UI completa
```

### Components existents reutilitzats

```
app/components/ui/Modal.tsx     # Modal genèric (isOpen, onClose, title, children, footer)
app/components/ui/button.tsx    # Botó amb variants (primary, ghost) i loading state
app/components/ui/PageHeader.tsx
app/components/ui/Breadcrumb.tsx
app/components/layout/AdminLayout.tsx
```

---

## 📊 Detall d'Implementació

### 1. API `GET /api/center/users`

**Permisos:** `editor_profe` o `admin_global` autenticats

**Comportament:**
1. Obtenir usuari autenticat i el seu `center_id` de la taula `users`
2. Verificar que `role` és `editor_profe` o `admin_global`
3. Query `users` filtrat per `center_id` de l'usuari
4. Suportar paràmetres de filtre: `role`, `is_active`, `search` (email o nom amb ilike)
5. Retornar usuaris ordenats per `created_at` descendent

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "Nom Complet",
      "role": "editor_alumne",
      "is_active": true,
      "onboarding_status": "active",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

### 2. API `POST /api/center/users`

**Permisos:** `editor_profe` o `admin_global` autenticats

**Body:**
```typescript
{
  email: string;         // Obligatori, format email vàlid
  full_name: string;     // Obligatori
  role: 'editor_profe' | 'editor_alumne' | 'display';  // Obligatori, NO admin_global
}
```

**Comportament:**
1. Validar camps obligatoris i format email
2. Rebutjar si `role === 'admin_global'` (403)
3. Obtenir `center_id` de l'usuari autenticat
4. Crear auth user amb `supabase.auth.admin.inviteUserByEmail()` (requereix service role key)
5. Crear perfil a la taula `users` amb:
   - `center_id` del professor
   - `onboarding_status: 'invited'`
   - `is_active: true`
6. Retornar l'usuari creat

**Errors a gestionar:**
- Email duplicat → `409 Conflict`
- Camps mancants → `400 Bad Request`
- Rol invàlid → `403 Forbidden`

---

### 3. API `PATCH /api/center/users/[id]`

**Permisos:** `editor_profe` o `admin_global` autenticats

**Body (tots opcionals):**
```typescript
{
  full_name?: string;
  role?: 'editor_profe' | 'editor_alumne' | 'display';
  is_active?: boolean;
}
```

**Comportament:**
1. Verificar que l'usuari objectiu pertany al mateix centre que l'editor
2. Rebutjar si intenta editar-se a ell mateix el rol o desactivar-se
3. Si canvia `is_active` a `false` o canvia `role` des de `editor_profe`:
   - Verificar que queda almenys 1 `editor_profe` actiu al centre
   - Si no, retornar `400` amb missatge explicatiu
4. Actualitzar l'usuari
5. Si canvia el `role`, actualitzar també `user_metadata` a Supabase Auth

**Validació "últim editor_profe" (SQL conceptual):**
```sql
SELECT COUNT(*) FROM users
WHERE center_id = :centerId
  AND role = 'editor_profe'
  AND is_active = true
  AND id != :targetUserId;
-- Si count = 0, no permetre el canvi
```

---

### 4. API `POST /api/center/users/[id]/resend-invite`

**Permisos:** `editor_profe` o `admin_global` autenticats

**Comportament:**
1. Verificar que l'usuari objectiu pertany al centre de l'editor
2. Verificar `onboarding_status = 'invited'`
3. Verificar cooldown de 5 minuts (camp `last_invitation_sent_at`)
4. Cridar `supabase.auth.admin.inviteUserByEmail()`
5. Actualitzar `last_invitation_sent_at`

---

### 5. Pàgina `/usuaris`

La pàgina serà un component `'use client'` que reutilitza els patrons de `UsersTab.tsx` d'admin, simplificats:

**Diferències amb UsersTab:**
- No mostra filtre de centre (implícit)
- No mostra columna "Centre" a la taula
- Selector de rol al formulari: 3 opcions (no admin_global)
- No mostra camp "Centre" al formulari (auto-assignat)
- Afegeix validació visual: "No et pots desactivar a tu mateix"

**Estructura de la pàgina:**
```
AdminLayout
├── Breadcrumb ["Usuaris"]
├── PageHeader "Gestió d'Usuaris del Centre"
├── Filtres (cerca + rol + estat + botó crear)
├── Taula d'usuaris
│   ├── Email
│   ├── Nom
│   ├── Rol (badge)
│   ├── Estat (badge actiu/inactiu)
│   ├── Onboarding (badge convidat/actiu)
│   └── Accions (editar, reenviar invitació, activar/desactivar)
└── Modal crear/editar
```

---

## 📐 Disseny Visual

### Badges de rol
- **Editor Professor:** `bg-blue-100 text-blue-700`
- **Editor Alumne:** `bg-purple-100 text-purple-700`
- **Display:** `bg-gray-100 text-gray-600`

### Badges d'estat
- **Actiu:** `bg-green-100 text-green-700` amb "✓ Actiu"
- **Inactiu:** `bg-gray-100 text-gray-600` amb "○ Inactiu"

### Badges d'onboarding
- **Actiu:** `text-green-600` "✓ Actiu"
- **Convidat:** `text-yellow-600` "⏳ Convidat"

### Accions
- **Editar:** icona llapis, hover blau
- **Reenviar invitació:** icona email (només si `onboarding_status = 'invited'`)
- **Activar/Desactivar:** toggle amb confirmació

---

## 🔗 Dependències Externes

Cap nova dependència. Tot s'implementa amb:
- React (useState, useEffect, useCallback)
- Tailwind CSS
- Supabase Admin API (`inviteUserByEmail`) — ja en ús a M2
- Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`) — ja configurat

---

## 📋 Tasques Ordenades

### Fase 1: API Routes
1. Crear `GET /api/center/users` — llistar usuaris del centre
2. Crear `POST /api/center/users` — crear usuari amb invitació
3. Crear `PATCH /api/center/users/[id]` — editar usuari amb validacions
4. Crear `POST /api/center/users/[id]/resend-invite` — reenviar invitació

### Fase 2: Pàgina `/usuaris`
5. Implementar UI completa a `app/usuaris/page.tsx` (substituir placeholder)
6. Taula d'usuaris amb filtres (cerca, rol, estat)
7. Modal crear usuari (email, nom, rol)
8. Modal editar usuari (nom, rol, estat)
9. Botó reenviar invitació amb cooldown
10. Botó activar/desactivar amb confirmació

### Fase 3: Validacions
11. Validació "últim editor_profe": no permetre desactivar o canviar rol si és l'últim actiu
12. Validació "auto-edició": no permetre canviar-se el rol ni desactivar-se un mateix
13. Verificar que `admin_global` també funciona a `/usuaris`

### Fase 4: Verificació
14. Testejar amb `editor_profe`: crear, editar, desactivar, reenviar invitació
15. Testejar amb `admin_global`: accés i gestió des de `/usuaris`
16. Verificar que `editor_alumne` NO pot accedir a `/usuaris` (sidebar no mostra l'opció)
17. Verificar que un `editor_profe` no veu usuaris d'altres centres

---

## ⚠️ Consideracions

1. **Service Role Key:** Les operacions de creació d'usuaris requereixen `SUPABASE_SERVICE_ROLE_KEY` per cridar `auth.admin.inviteUserByEmail()`. Aquesta clau ja està configurada a `.env.local` i Vercel.

2. **admin_global a `/usuaris`:** L'admin global pot usar tant `/admin` (gestió global) com `/usuaris` (gestió per centre). A `/usuaris`, veu els usuaris del centre que té assignat (normalment "Centre Lacenet").

3. **Reutilització vs. duplicació:** Les API routes de `/api/center/users` no reutilitzen directament `/api/admin/users` sinó que són routes noves amb lògica de permisos diferent. Això és intencionat: mantenir cada ruta amb responsabilitat clara.

4. **Soft delete:** Desactivar un usuari (`is_active = false`) no esborra res. L'usuari pot ser reactivat. El login quedarà bloquejat pels checks de `proxy.ts` / API routes.

5. **Email case-insensitive:** Al validar duplicats d'email, usar comparació case-insensitive (`ilike` o `.toLowerCase()`).

6. **RLS policies:** Les API routes de `/api/center/users` fan servir el `createClient()` normal (no admin), per tant les RLS policies s'apliquen. Per operacions que requereixen bypass de RLS (com inserir a la taula `users` després de crear l'auth user), cal usar el `createAdminClient` amb service role key, seguint el patró existent a `/api/admin/users`.
