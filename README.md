# PUBLI*CAT

Plataforma de vídeo per a centres educatius que permet centralitzar, organitzar i compartir contingut audiovisual educatiu.

## 🎯 Descripció

PUBLI*CAT és una aplicació web desenvolupada amb Next.js que permet als centres educatius:

- 📹 Centralitzar i gestionar tots els vídeos educatius de Vimeo
- 🏷️ Organitzar contingut amb tags globals i hashtags per centre
- 🔄 Compartir vídeos entre centres educatius
- 📺 Crear playlists per a pantalles informatives (en desenvolupament)
- 🔐 Gestionar l'accés amb autenticació segura i sistema de rols
- 👥 Convidar i gestionar usuaris amb diferents permisos
- 🎛️ Panel d'administració complet per a gestió de centres, zones i usuaris

## 🚀 Tecnologies

- **Framework**: [Next.js 15](https://nextjs.org) (App Router)
- **Autenticació**: [Supabase Auth](https://supabase.com/auth)
- **Estils**: [Tailwind CSS](https://tailwindcss.com)
- **Llenguatge**: TypeScript
- **Deployment**: [Vercel](https://vercel.com)

## 📋 Prerequisits

- Node.js 18+ i npm
- Compte de Supabase (per a autenticació)
- Compte de Vercel (per a deployment)

## 🛠️ Instal·lació

1. Clona el repositori:
```bash
git clone https://github.com/publicat-lacenet/publicat.git
cd publicat
```

2. Instal·la les dependències:
```bash
npm install
```

3. Configura les variables d'entorn:

Crea un fitxer `.env.local` amb:
```env
NEXT_PUBLIC_SUPABASE_URL=la-teva-url-de-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=la-teva-anon-key
VIMEO_ACCESS_TOKEN=el-teu-token-de-vimeo
```

4. Executa el servidor de desenvolupament:
```bash
npm run dev
```

Obre [http://localhost:3000](http://localhost:3000) al navegador.

## 🎨 Guia d'Estil

La guia d'estil del projecte es troba a [`documentacion/guia_estil.md`](documentacion/guia_estil.md)

## 🔐 Sistema d'Autenticació

El projecte utilitza autenticació amb email/contrasenya mitjançant Supabase:

- **Login**: `/login` - Inici de sessió amb email i contrasenya
- **Recuperació**: `/reset-password` - Restablir contrasenya per email
- **Invitacions**: `/auth/confirm` - Acceptar invitació i crear contrasenya
- **Callback**: `/auth/callback` - Gestió de tokens d'autenticació

### Configuració de Supabase

1. **URL Configuration**:
   - Site URL: `https://publicat-lovat.vercel.app`
   - Redirect URLs: `/auth/callback`, `/auth/confirm`, `/reset-password`

2. **Email Templates**:
   - Invite User: Plantilla personalitzada en català
   - Reset Password: Plantilla personalitzada en català
   - Email OTP Expiration: 86400 segons (24 hores)

## 📂 Estructura del Projecte

```
app/
├── page.tsx                    # Landing page
├── login/                      # Pàgina de login
├── contingut/                  # Gestió de vídeos (M3a)
├── admin/                      # Panel d'administració (M2)
│   └── tabs/                   # Tabs de gestió
│       ├── CentresTab.tsx      # Gestió de centres
│       ├── UsersTab.tsx        # Gestió d'usuaris
│       └── ZonesTab.tsx        # Gestió de zones
├── dashboard/                  # Dashboard principal
├── reset-password/             # Recuperació de contrasenya
│   └── confirm/                # Confirmar nova contrasenya
├── auth/
│   ├── callback/               # Callback d'autenticació
│   └── confirm/                # Confirmació d'invitació
├── components/
│   ├── layout/                 # Components de layout
│   │   ├── AppHeader.tsx       # Header amb info de rol
│   │   └── AppSidebar.tsx      # Sidebar dinàmic per rol
│   ├── videos/                 # Components de vídeo
│   │   ├── VideoCard.tsx       # Card de vídeo
│   │   ├── VideoGrid.tsx       # Grid responsive
│   │   ├── VideoFormModal.tsx  # Formulari creació/edició
│   │   ├── TagSelector.tsx     # Selector de tags
│   │   ├── HashtagInput.tsx    # Input de hashtags
│   │   └── VimeoUrlInput.tsx   # Input amb validació
│   └── ui/                     # Components UI reutilitzables
└── api/
    ├── videos/                 # CRUD de vídeos
    │   ├── route.ts            # GET, POST
    │   └── [id]/route.ts       # PATCH, DELETE
    ├── vimeo/                  # Validació Vimeo
    │   └── validate/route.ts
    ├── auth/
    │   └── me/route.ts         # Hidratació de sessió
    └── admin/                  # Gestió administrativa
        ├── centers/
        ├── users/
        └── zones/

docs/                           # Documentació completa
├── overview.md                 # Visió general
├── database.schema.md          # Esquema de BD
├── roles.md                    # Sistema de rols
├── authentication.md           # Autenticació
├── vimeo-integration.md        # Integració Vimeo
├── admin-global-center-policy.md # Política admin global
└── milestones/                 # Documents de milestones

hooks/
├── useAuth.ts                  # Hook d'autenticació
├── useVideos.ts                # Gestió de vídeos
└── useVimeoValidation.ts       # Validació Vimeo

supabase/
└── migrations/                 # Migracions de BD (M1)

utils/
└── supabase/                   # Clients de Supabase
    ├── client.ts               # Client-side
    └── server.ts               # Server-side
```

## 👥 Rols d'Usuari

El sistema implementa 4 rols amb permisos diferenciats:

### 🔑 Admin Global
- Gestió completa de centres, zones i usuaris
- Accés a totes les funcionalitats administratives
- Pot crear i editar contingut de qualsevol centre
- **Associat automàticament al Centre Lacenet**
- Compartició intercentres automàtica

### 📝 Editor Profe
- Gestió de vídeos del seu centre
- Creació, edició i eliminació de contingut
- Pot compartir vídeos amb altres centres
- Gestió de tags i hashtags

### 👨‍🎓 Editor Alumne
- Visualització de vídeos del centre
- Gestió de llistes personalitzades (futur)
- Accés a contingut compartit

### 🖥️ Display
- Mode pantalla (només visualització)
- Reproducció automàtica de playlists
- Sense controls d'edició

## 🔗 Integració amb Vimeo

El projecte utilitza l'API de Vimeo per a la gestió de contingut audiovisual:

- ✅ Validació de URLs de vídeos en temps real
- ✅ Obtenció automàtica de thumbnails
- ✅ Extracció de metadades (títol, durada, descripció)
- ✅ Sistema de fallback amb oEmbed per a vídeos no llistats
- ✅ Preview del vídeo abans de guardar

**Configuració necessària:**
```env
VIMEO_ACCESS_TOKEN=el-teu-token-dacces
```

## 🎨 Colors Corporatius

- **Groc principal**: `#FEDD2C`
- **Rosa accent**: `#F91248`
- **Verd/Cian**: `#16AFAA`
- **Fons**: `#F9FAFB`
- **Text**: `#111827`

## 📱 Funcionalitats Implementades

### ✅ Milestone 1: Base de Dades (M1)
- Esquema core complet (centres, usuaris, zones)
- Esquema de contingut (vídeos, tags, hashtags)
- Sistema de playlists
- RLS (Row Level Security) per a tots els rols
- Triggers i funcions automatitzades
- Seeds de dades inicials

### ✅ Milestone 2: Admin UI (M2)
- Panel d'administració complet
- Gestió de centres educatius
- Gestió d'usuaris amb invitacions
- Gestió de zones territorials
- Sistema de tabs amb navegació
- Validacions i feedback visual

### ✅ Milestone 3a: Contingut Base (M3a - ✅ 100% COMPLETAT)
- ✅ Pàgina de gestió de vídeos
- ✅ **Creació de vídeos amb integració Vimeo**
  - Validació en temps real d'URLs de Vimeo
  - Obtenció automàtica de metadades
  - Preview del vídeo abans de guardar
- ✅ **Edició de vídeos**
  - Modal reutilitzable (crear + editar)
  - URL de Vimeo no editable en mode edició
  - Refetch automàtic després d'actualitzar
- ✅ **Eliminació de vídeos** amb confirmació
- ✅ **Sistema de tags globals** (multi-selecció)
- ✅ **Sistema de hashtags per centre**
  - UX coherent (input sense #, chips amb #)
  - Creació automàtica si no existeixen
- ✅ **Compartició intercentres** (per editor-profe i admin-global)
- ✅ **Filtres avançats**
  - Cerca per títol
  - Filtrat per tipus (contingut/anunci)
  - Inclusió de vídeos compartits
- ✅ **Paginació** amb 24 vídeos per pàgina
- ✅ **Grid responsive** amb cards de vídeo
- ✅ **Thumbnails** amb fallback automàtic

### ✅ Política Admin Global
- ✅ Centre Lacenet per defecte per a administradors
- ✅ Migració automàtica d'usuaris existents
- ✅ Trigger per a nous administradors
- ✅ Documentació completa de la política

### 🎯 Funcionalitats Generals
- ✅ Landing page responsive
- ✅ Sistema de login amb email/contrasenya
- ✅ Recuperació de contrasenya per email
- ✅ Sistema d'invitacions per a nous usuaris
- ✅ Callbacks d'autenticació
- ✅ Gestió de sessions amb Supabase
- ✅ Sidebar dinàmic segons rol
- ✅ Header amb indicador de rol
- ✅ Middleware de protecció de rutes

## 🚧 Pròxims Desenvolupaments

- 📋 **M4**: Gestió de llistes de reproducció
- 📡 **M5**: Integració amb feeds RSS
- 🖥️ **M6**: Mode visor per a pantalles
- 🎨 **M7**: Personalització visual per centre
- 🔍 **Millores**: Sistema de cerca avançada i filtres dinàmics

## 🌐 Deployment

El projecte està desplegat a Vercel:
- **Producció**: https://publicat-lovat.vercel.app

Per desplegar canvis:
```bash
git push origin main
```

Vercel detecta automàticament els canvis i redesplega.

## 📝 Scripts Disponibles

```bash
npm run dev          # Servidor de desenvolupament
npm run build        # Build de producció
npm run start        # Servidor de producció
npm run lint         # Linter
```

## 🤝 Contribució

Aquest és un projecte pilot per a centres educatius de la xarxa Lacenet.

## 📄 Llicència

Propietat de Lacenet - Desenvolupament intern per a centres educatius

---

**PUBLI\*CAT** - Plataforma de vídeo per a centres educatius
