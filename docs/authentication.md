# Autenticació i Gestió d'Usuaris — Publicat

## 1) Visió General

Publicat utilitza **Supabase Auth** per gestionar l'autenticació d'usuaris amb les següents característiques:

- ✅ **Invitació per email** (onboarding controlat)
- ✅ **Magic links** per establir contrasenya inicial
- ✅ **Sessions persistents** per usuaris Display (TV)
- ✅ **Sessions estàndard** per editors i administradors
- ✅ **Integració 1:1** amb taula `users` (perfil d'aplicació)

---

## 2) Model d'Autenticació

### 2.1 Relació auth.users ↔ public.users

```
auth.users (Supabase Auth)          public.users (Perfil App)
├─ id (UUID)                    ←→  ├─ id (mateix UUID)
├─ email                            ├─ email (cache)
├─ encrypted_password               ├─ role
├─ email_confirmed_at               ├─ center_id
├─ last_sign_in_at                  ├─ onboarding_status
└─ created_at                       ├─ is_active
                                    └─ ... metadades

Relació: 1:1 (mateix id)
```

**Principis:**
- `auth.users` gestiona **credencials i autenticació**
- `public.users` gestiona **permisos i lògica de negoci**
- L'`id` és el mateix a ambdues taules (FK en crear usuari)

---

## 3) Flux d'Invitació d'Usuaris

### 3.1 Creació d'Usuari (Backend)

```typescript
// app/api/users/invite/route.ts
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { email, role, centerId, fullName } = await request.json()
  
  // 1. Crear usuari a auth.users (amb invitació)
  const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        role,
        center_id: centerId,
        full_name: fullName
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`
    }
  )
  
  if (authError) throw authError
  
  // 2. Crear perfil a public.users
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email: email,
      role: role,
      center_id: centerId,
      full_name: fullName,
      onboarding_status: 'invited',
      invited_at: new Date().toISOString(),
      last_invitation_sent_at: new Date().toISOString(),
      is_active: true,
      created_by_user_id: (await supabase.auth.getUser()).data.user?.id
    })
  
  if (profileError) throw profileError
  
  return Response.json({ success: true, userId: authData.user.id })
}
```

### 3.2 Email d'Invitació

Supabase envia automàticament un email amb:
- **Subject:** "Has estat convidat a Publicat"
- **Content:** Enllaç per establir contrasenya
- **Link:** `https://app.publicat.cat/auth/confirm?token=...&type=invite`

**Configurar template a Supabase:**
1. Dashboard → Authentication → Email Templates
2. Seleccionar "Invite user"
3. Personalitzar:

```html
<h2>Benvingut a Publicat</h2>
<p>Has estat convidat a unir-te al sistema Publicat.</p>
<p>
  <a href="{{ .ConfirmationURL }}">
    Estableix la teva contrasenya
  </a>
</p>
<p>Aquest enllaç caduca en 24 hores.</p>
```

### 3.3 Pàgina de Confirmació

```typescript
// app/auth/confirm/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function ConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const handleConfirmation = async () => {
      const token = searchParams.get('token')
      const type = searchParams.get('type')
      
      if (!token || type !== 'invite') {
        setError('Enllaç no vàlid')
        setLoading(false)
        return
      }
      
      const supabase = createClient()
      
      // Verificar token
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'invite'
      })
      
      if (error) {
        setError('L\'enllaç ha caducat o no és vàlid')
        setLoading(false)
        return
      }
      
      // Redirigir a establir contrasenya
      router.push('/auth/set-password')
    }
    
    handleConfirmation()
  }, [searchParams, router])
  
  if (loading) return <div>Verificant invitació...</div>
  if (error) return <div>Error: {error}</div>
  
  return null
}
```

### 3.4 Establir Contrasenya

```typescript
// app/auth/set-password/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useForm } from 'react-hook-form'

export default function SetPasswordPage() {
  const router = useRouter()
  const { register, handleSubmit, watch } = useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const password = watch('password')
  
  const onSubmit = async (data: { password: string }) => {
    setLoading(true)
    setError(null)
    
    const supabase = createClient()
    
    // Actualitzar contrasenya
    const { error: updateError } = await supabase.auth.updateUser({
      password: data.password
    })
    
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }
    
    // Actualitzar estat d'onboarding
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase
        .from('users')
        .update({
          onboarding_status: 'active',
          activated_at: new Date().toISOString()
        })
        .eq('id', user.id)
    }
    
    // Redirigir segons rol
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user?.id)
      .single()
    
    if (profile?.role === 'display') {
      router.push('/pantalla')
    } else {
      router.push('/pantalla') // Dashboard principal
    }
  }
  
  return (
    <div className="max-w-md mx-auto mt-8 p-6">
      <h1 className="text-2xl font-bold mb-6">Estableix la teva contrasenya</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Contrasenya
          </label>
          <input
            type="password"
            {...register('password', {
              required: 'La contrasenya és obligatòria',
              minLength: {
                value: 8,
                message: 'Mínim 8 caràcters'
              }
            })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Confirma la contrasenya
          </label>
          <input
            type="password"
            {...register('confirmPassword', {
              validate: value => value === password || 'Les contrasenyes no coincideixen'
            })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Guardant...' : 'Guardar contrasenya'}
        </button>
      </form>
      
      {/* Indicador de força de contrasenya */}
      <PasswordStrengthIndicator password={password} />
    </div>
  )
}
```

---

## 4) Reenviar Invitació

### 4.1 API Endpoint

```typescript
// app/api/users/resend-invite/route.ts
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { userId } = await request.json()
  
  // Verificar que l'usuari està pendent
  const { data: user } = await supabase
    .from('users')
    .select('email, onboarding_status, last_invitation_sent_at')
    .eq('id', userId)
    .single()
  
  if (!user) throw new Error('Usuari no trobat')
  
  if (user.onboarding_status !== 'invited') {
    throw new Error('L\'usuari ja ha completat l\'alta')
  }
  
  // Cooldown de 10 minuts
  const lastSent = new Date(user.last_invitation_sent_at)
  const now = new Date()
  const minutesSinceLastInvite = (now.getTime() - lastSent.getTime()) / 1000 / 60
  
  if (minutesSinceLastInvite < 10) {
    throw new Error(`Espera ${Math.ceil(10 - minutesSinceLastInvite)} minuts abans de reenviar`)
  }
  
  // Reenviar invitació
  const { error } = await supabase.auth.admin.inviteUserByEmail(
    user.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`
    }
  )
  
  if (error) throw error
  
  // Actualitzar timestamp
  await supabase
    .from('users')
    .update({ last_invitation_sent_at: now.toISOString() })
    .eq('id', userId)
  
  return Response.json({ success: true })
}
```

---

## 5) Login d'Usuaris Existents

### 5.1 Pàgina de Login

```typescript
// app/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const supabase = createClient()
    
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (signInError) {
      setError('Email o contrasenya incorrectes')
      setLoading(false)
      return
    }
    
    // Verificar que l'usuari està actiu
    const { data: profile } = await supabase
      .from('users')
      .select('role, is_active, onboarding_status')
      .eq('id', data.user.id)
      .single()
    
    if (!profile?.is_active) {
      await supabase.auth.signOut()
      setError('El teu compte està desactivat')
      setLoading(false)
      return
    }
    
    if (profile.onboarding_status !== 'active') {
      setError('Completa el procés d\'activació primer')
      setLoading(false)
      return
    }
    
    // Redirigir segons rol
    if (profile.role === 'display') {
      router.push('/pantalla?mode=display')
    } else {
      router.push('/pantalla')
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-8">
          Publicat
        </h1>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Contrasenya
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Entrant...' : 'Entrar'}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <a
            href="/auth/reset-password"
            className="text-sm text-blue-600 hover:underline"
          >
            Has oblidat la contrasenya?
          </a>
        </div>
      </div>
    </div>
  )
}
```

---

## 6) Gestió de Sessions

### 6.1 Sessions per Rol Display (Persistents)

Per a pantalles de TV que no fan logout mai:

```typescript
// utils/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  )
}
```

**Configuració específica per Display:**

```typescript
// app/pantalla/layout.tsx
'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function PantallaLayout({ children }) {
  useEffect(() => {
    const supabase = createClient()
    
    // Refrescar token cada hora automàticament
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        await supabase.auth.refreshSession()
      }
    }, 60 * 60 * 1000) // Cada hora
    
    return () => clearInterval(interval)
  }, [])
  
  return <>{children}</>
}
```

### 6.2 Sessions Estàndard (Editors/Admin)

Timeout estàndard de 24 hores amb refresh automàtic.

**Middleware per verificar sessió:**

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options })
        }
      }
    }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // Rutes protegides
  const protectedRoutes = ['/pantalla', '/contingut', '/llistes', '/rss', '/admin']
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Verificar que l'usuari està actiu
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('is_active, onboarding_status')
      .eq('id', user.id)
      .single()
    
    if (!profile?.is_active || profile.onboarding_status !== 'active') {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  
  return response
}

export const config = {
  matcher: ['/pantalla/:path*', '/contingut/:path*', '/llistes/:path*', '/rss/:path*', '/admin/:path*']
}
```

---

## 7) Restabliment de Contrasenya

### 7.1 Sol·licitar Reset

```typescript
// app/auth/reset-password/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const supabase = createClient()
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password/confirm`
    })
    
    setLoading(false)
    
    // Sempre mostrar èxit (per seguretat)
    setSent(true)
  }
  
  if (sent) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Comprova el teu email</h2>
        <p className="text-gray-600">
          Si existeix un compte amb aquest email, rebràs un enllaç per
          restablir la contrasenya.
        </p>
      </div>
    )
  }
  
  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Restablir contrasenya</h1>
      
      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {loading ? 'Enviant...' : 'Enviar enllaç'}
        </button>
      </form>
    </div>
  )
}
```

---

## 8) Polítiques de Contrasenya

### 8.1 Configuració a Supabase

Dashboard → Authentication → Policies:

```
Minimum password length: 8
Require uppercase: No (per facilitat d'ús)
Require lowercase: No
Require numbers: No
Require special characters: No
```

**Recomanació:** Política relaxada però amb validació visual de força al frontend.

### 8.2 Validador de Força

```typescript
// utils/passwordStrength.ts
export function getPasswordStrength(password: string): {
  score: number // 0-4
  label: string
  color: string
} {
  let score = 0
  
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  
  const labels = ['Molt feble', 'Feble', 'Mitjana', 'Forta', 'Molt forta']
  const colors = ['red', 'orange', 'yellow', 'lime', 'green']
  
  const finalScore = Math.min(score, 4)
  
  return {
    score: finalScore,
    label: labels[finalScore],
    color: colors[finalScore]
  }
}
```

**Component visual:**

```typescript
// components/PasswordStrengthIndicator.tsx
export function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null
  
  const { score, label, color } = getPasswordStrength(password)
  
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded ${
              i <= score ? `bg-${color}-500` : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs text-${color}-600`}>
        Força: {label}
      </p>
    </div>
  )
}
```

---

## 9) Trigger: Sincronització auth.users ↔ public.users

### 9.1 Trigger per Mantenir Email Actualitzat

```sql
-- Trigger per actualitzar email a public.users quan canvia a auth.users
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET email = NEW.email,
      updated_at = now()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_email_updated
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION sync_user_email();
```

---

## 10) Row Level Security (RLS)

### 10.1 Políticas per `public.users`

```sql
-- Usuaris poden veure el seu propi perfil
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Usuaris poden veure altres usuaris del seu centre
CREATE POLICY "Users can view center users"
ON public.users FOR SELECT
TO authenticated
USING (
  center_id IN (
    SELECT center_id FROM public.users WHERE id = auth.uid()
  )
);

-- Admin global pot veure tots
CREATE POLICY "Admin global can view all users"
ON public.users FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin_global' AND is_active = true
  )
);

-- Editor-profe pot crear usuaris del seu centre
CREATE POLICY "Editor-profe can create center users"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (
  center_id IN (
    SELECT center_id FROM public.users
    WHERE id = auth.uid() AND role = 'editor_profe' AND is_active = true
  )
  AND role IN ('editor_profe', 'editor_alumne', 'display')
);

-- Admin global pot crear qualsevol usuari
CREATE POLICY "Admin global can create any user"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin_global' AND is_active = true
  )
);
```

---

## 11) Configuració de Supabase Auth

### 11.1 Variables d'Entorn

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # Només backend

# URLs
NEXT_PUBLIC_APP_URL=https://app.publicat.cat
```

### 11.2 Site URL i Redirect URLs

Dashboard → Authentication → URL Configuration:

```
Site URL: https://app.publicat.cat
Redirect URLs:
  - https://app.publicat.cat/auth/confirm
  - https://app.publicat.cat/auth/callback
  - https://app.publicat.cat/auth/reset-password/confirm
  - http://localhost:3000/auth/** (desenvolupament)
```

---

## 12) Testing

### 12.1 Test d'Invitació

```typescript
// __tests__/auth/invite.test.ts
describe('User Invitation', () => {
  test('crea usuari i envia invitació', async () => {
    const response = await fetch('/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        role: 'editor_alumne',
        centerId: 'test-center-id'
      })
    })
    
    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.userId).toBeDefined()
  })
  
  test('no permet duplicats d\'email', async () => {
    // Intentar crear mateix email dues vegades
    await expect(createUser('duplicate@test.com'))
      .rejects.toThrow()
  })
})
```

---

## 13) Checklist d'Implementació

**Configuració inicial:**
- [ ] Configurar Site URL i Redirect URLs a Supabase
- [ ] Personalitzar templates d'email (invite, reset password)
- [ ] Configurar política de contrasenyes
- [ ] Configurar variables d'entorn

**Backend:**
- [ ] API route `/api/users/invite`
- [ ] API route `/api/users/resend-invite`
- [ ] Triggers SQL per sincronització
- [ ] Políticas RLS per `public.users`

**Frontend:**
- [ ] Pàgina `/login`
- [ ] Pàgina `/auth/confirm`
- [ ] Pàgina `/auth/set-password`
- [ ] Pàgina `/auth/reset-password`
- [ ] Middleware per protegir rutes
- [ ] Component `PasswordStrengthIndicator`

**Testing:**
- [ ] Flux complet d'invitació
- [ ] Login amb usuari existent
- [ ] Restabliment de contrasenya
- [ ] Sessions persistents per Display
- [ ] Verificar RLS amb diferents rols

---

## 14) Referències

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Invite Users API](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

---

**Temps estimat d'implementació:** 4-5 hores (incloent configuració, templates i testing)
