# PUBLI*CAT - Estado Actual del Proyecto

**Fecha**: 16 de diciembre de 2025  
**Versión**: MVP - Sistema de Autenticación Completo

---

## 📋 ¿Qué es PUBLI*CAT?

Plataforma web para centros educativos que permite centralizar, organizar y compartir vídeos educativos. Incluye gestión de playlists para pantallas informativas del centro.

---

## 🎯 Estado Actual - Funcionalidades Implementadas

### ✅ **Sistema de Autenticación (100% Completo)**

- **Login con email/password** (`/login`)
- **Recuperación de contraseña por email** (`/reset-password`)
- **Confirmación de nueva contraseña** (`/reset-password/confirm`)
- **Sistema de invitaciones** (`/auth/confirm`)
- **Callback de autenticación** (`/auth/callback`)
- **Gestión de sesiones** con Supabase Auth

### ✅ **Landing Page**

- Página principal responsive (`/`)
- Diseño corporativo con colores Lacenet
- Información del proyecto
- Enlaces a login

### ✅ **Infraestructura**

- Framework: Next.js 15 (App Router)
- Base de datos: Supabase (PostgreSQL)
- Deployment: Vercel (https://publicat-lovat.vercel.app)
- Control de versiones: GitHub (publicat-lacenet/publicat)
- CLI: Supabase vinculado con `npx`

---

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 15, React 19, TypeScript
- **Estilos**: Tailwind CSS
- **Autenticación**: Supabase Auth
- **Base de Datos**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Fuentes**: Montserrat (títulos), Inter (texto)

---

## 🎨 Identidad Visual

**Colores corporativos:**
- Amarillo principal: `#FEDD2C`
- Rosa accent: `#F91248`
- Verde/Cian: `#16AFAA`
- Fondo: `#F9FAFB`
- Texto: `#111827`

**Guía de estilo**: `documentacion/guia_estil.md`

---

## 📂 Estructura del Proyecto

```
app/
├── page.tsx                    # Landing page
├── login/page.tsx              # Login email/password
├── reset-password/
│   ├── page.tsx                # Solicitar reset
│   └── confirm/page.tsx        # Nueva contraseña
├── auth/
│   ├── callback/route.ts       # Procesa tokens auth
│   └── confirm/page.tsx        # Acepta invitación
└── pantalla/page.tsx           # Dashboard (protegido)

utils/supabase/
├── client.ts                   # Cliente Supabase (client-side)
└── server.ts                   # Cliente Supabase (server-side)

supabase/
└── migrations/                 # Migraciones de BD (vacío por ahora)

documentacion/
└── guia_estil.md              # Guía de estilo del proyecto
```

---

## ⚙️ Configuración de Supabase

**URL Configuration:**
- Site URL: `https://publicat-lovat.vercel.app`
- Redirect URLs:
  - `/auth/callback`
  - `/auth/confirm`
  - `/reset-password`

**Email Provider:**
- Enable Email: ✅ ON
- Secure email change: ✅ ON
- Email OTP Expiration: 86400s (24 horas)
- Minimum password length: 6 caracteres

**Email Templates (en català):**
- ✅ Invite User: Plantilla personalizada
- ✅ Reset Password: Plantilla personalizada

**Vinculación CLI:**
```bash
npx supabase link --project-ref tvsafusrasfzubiujavk
```

---

## 🚀 Flujo de Trabajo Actual

### **Desarrollo Local (UI)**
```bash
npm run dev
# → Cambios de UI/componentes/estilos
# → Visualización instantánea en http://localhost:3000
# → Conectado a BD de Supabase en producción
```

### **Cambios de Base de Datos**
1. Modificar en **Supabase Dashboard**
2. Generar migración (opcional):
   ```bash
   npx supabase db diff --linked --schema public -f nombre_cambio
   ```
3. Probar en producción (Vercel)

### **Deploy**
```bash
git add .
git commit -m "descripción"
git push origin main
# → Vercel despliega automáticamente
```

---

## 🔐 Variables de Entorno

**`.env.local` (local):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://tvsafu.....
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Vercel (producción):**
- Mismas variables configuradas en Vercel Dashboard

---

## 🚧 Próximos Pasos (Pendiente)

1. **Gestión de Vídeos**
   - Subir vídeos a Vimeo/almacenamiento
   - CRUD de vídeos
   - Metadatos (título, descripción, materia, fecha)

2. **Sistema de Playlists**
   - Crear/editar playlists
   - Asignar vídeos a playlists
   - Playlists por pantalla del centro

3. **Visualizador para Pantallas**
   - Vista full-screen sin navegación
   - Reproducción automática en loop
   - Transiciones entre vídeos

4. **Panel de Administración**
   - Gestión de usuarios
   - Roles y permisos
   - Estadísticas básicas

5. **Base de Datos**
   - Tabla: `videos`
   - Tabla: `playlists`
   - Tabla: `playlist_videos` (relación)
   - Tabla: `screens` (pantallas del centro)

---

## 📝 Comandos Útiles

```bash
# Desarrollo
npm run dev                     # Servidor local
npm run build                   # Build de producción
npm run lint                    # Linter

# Supabase CLI
npx supabase db diff --linked --schema public         # Ver cambios BD
npx supabase db diff --linked -f migration_name       # Generar migración
npx supabase db push                                  # Aplicar migraciones

# Git
git status                      # Ver cambios
git add .                       # Añadir todo
git commit -m "mensaje"         # Commit
git push origin main            # Subir a GitHub
```

---

## 🔗 Enlaces Importantes

- **Producción**: https://publicat-lovat.vercel.app
- **GitHub**: https://github.com/publicat-lacenet/publicat
- **Supabase**: https://supabase.com/dashboard/project/tvsafusrasfzubiujavk
- **Vercel**: Panel de deployments

---

## 📊 Métricas del Proyecto

- **Next.js**: v16.0.10 (actualizado por seguridad CVE-2025-55184, CVE-2025-55183)
- **React**: v19.0.0
- **Archivos creados**: ~15 archivos principales
- **Rutas públicas**: 6 páginas
- **Rutas protegidas**: 1 página (`/pantalla`)
- **Sistema de auth**: 100% funcional
- **Tests realizados**: Login, reset password, invitaciones ✅

---

## ⚡ Punto de Inicio para Nuevas Funcionalidades

El proyecto tiene la **base sólida de autenticación** lista. El siguiente paso es implementar la **gestión de vídeos** y el **sistema de playlists**.

**Esquema de BD sugerido**:
```sql
-- Tabla de vídeos
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  vimeo_id TEXT,
  subject TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de playlists
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  screen_location TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Relación playlist-videos
CREATE TABLE playlist_videos (
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  PRIMARY KEY (playlist_id, video_id)
);
```

---

**Última actualización**: 16/12/2025