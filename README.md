# PUBLI*CAT

Plataforma de vídeo per a centres educatius que permet centralitzar, organitzar i compartir contingut audiovisual educatiu.

## 🎯 Descripció

PUBLI*CAT és una aplicació web desenvolupada amb Next.js que permet als centres educatius:

- 📹 Centralitzar i gestionar tots els vídeos educatius de Vimeo
- ⬆️ **Pujar vídeos directament a Vimeo** des del formulari (M3b)
- 🏷️ Organitzar contingut amb tags globals i hashtags per centre
- 🔄 Compartir vídeos entre centres educatius
- 📺 Crear playlists per a pantalles informatives (en desenvolupament)
- 🔐 Gestionar l'accés amb autenticació segura i sistema de rols
- 👥 Convidar i gestionar usuaris amb diferents permisos
- 🎛️ Panel d'administració complet per a gestió de centres, zones i usuaris

## 🚀 Tecnologies

- **Framework**: [Next.js 16](https://nextjs.org) (App Router + Turbopack)
- **Base de dades**: [Supabase](https://supabase.com) (PostgreSQL)
- **Autenticació**: [Supabase Auth](https://supabase.com/auth)
- **Estils**: [Tailwind CSS](https://tailwindcss.com)
- **Llenguatge**: TypeScript
- **Vídeo**: [Vimeo API](https://developer.vimeo.com) + tus-js-client
- **Deployment**: [Vercel](https://vercel.com)

## 📋 Prerequisits

- Node.js 20+ i npm
- Compte de Supabase (per a base de dades i autenticació)
- Compte de Vimeo amb API token (scopes: private, upload, video_files, public)
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

La guia d'estil del projecte es troba a [`docs/ui/guia-estil.md`](docs/ui/guia-estil.md)

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
├── layout.tsx                  # Layout principal
├── globals.css                 # Estils globals
├── login/                      # Pàgina de login
├── contingut/                  # Gestió de vídeos (M3a + M3b)
├── admin/                      # Panel d'administració (M2)
│   └── tabs/                   # Tabs de gestió
│       ├── CentresTab.tsx      # Gestió de centres
│       ├── UsersTab.tsx        # Gestió d'usuaris
│       └── ZonesTab.tsx        # Gestió de zones
├── dashboard/                  # Dashboard principal
├── llistes/                    # Gestió de llistes (futur)
├── rss/                        # Configuració RSS (futur)
├── visor/                      # Mode visor (futur)
├── pantalla/                   # Mode pantalla (futur)
├── usuaris/                    # Gestió usuaris centre
├── perfil/                     # Perfil d'usuari
├── reset-password/             # Recuperació de contrasenya
│   └── confirm/                # Confirmar nova contrasenya
├── auth/
│   ├── callback/               # Callback d'autenticació
│   ├── confirm/                # Confirmació d'invitació
│   ├── signout/                # Tancament de sessió
│   └── auth-code-error/        # Errors d'autenticació
├── components/
│   ├── layout/                 # Components de layout
│   │   ├── AdminLayout.tsx     # Layout d'administració
│   │   ├── AppHeader.tsx       # Header amb info de rol
│   │   └── AppSidebar.tsx      # Sidebar dinàmic per rol
│   ├── videos/                 # Components de vídeo
│   │   ├── VideoCard.tsx       # Card de vídeo
│   │   ├── VideoGrid.tsx       # Grid responsive
│   │   ├── VideoFormModal.tsx  # Formulari creació/edició
│   │   ├── VideoPreviewModal.tsx # Preview del vídeo
│   │   ├── VideoUploader.tsx   # 📤 Pujada directa a Vimeo (M3b)
│   │   ├── TagSelector.tsx     # Selector de tags
│   │   ├── HashtagInput.tsx    # Input de hashtags
│   │   └── VimeoUrlInput.tsx   # Input amb validació URL
│   └── ui/                     # Components UI reutilitzables
│       └── PageHeader.tsx      # Header de pàgina
└── api/
    ├── videos/                 # CRUD de vídeos
    │   ├── route.ts            # GET, POST
    │   └── [id]/route.ts       # PATCH, DELETE
    ├── vimeo/                  # Integració Vimeo
    │   ├── validate/route.ts   # Validació d'URLs
    │   ├── upload/             # 📤 Pujada directa (M3b)
    │   │   └── ticket/route.ts # Obtenir ticket Tus
    │   └── status/             # Estat del vídeo
    │       └── [videoId]/route.ts
    ├── auth/
    │   └── me/route.ts         # Hidratació de sessió
    ├── invite-user/            # Invitació d'usuaris
    └── admin/                  # Gestió administrativa
        ├── centers/            # CRUD centres
        ├── users/              # CRUD usuaris
        └── zones/              # CRUD zones

docs/                           # Documentació completa
├── overview.md                 # Visió general
├── database.schema.md          # Esquema de BD
├── roles.md                    # Sistema de rols
├── authentication.md           # Autenticació
├── vimeo-integration.md        # Integració Vimeo
├── moderation-system.md        # Sistema de moderació
├── rss-system.md               # Sistema RSS
├── storage.md                  # Emmagatzematge
├── admin-global-center-policy.md # Política admin global
├── CHANGELOG.md                # Historial de canvis
├── ui/                         # Documentació UI
│   ├── guia-estil.md           # Guia d'estil
│   ├── estructura-layout.md    # Estructura layout
│   └── ...                     # Altres docs UI
└── milestones/                 # Documents de milestones
    ├── M1-*.md                 # M1: Base de dades
    ├── M2-admin-ui.md          # M2: Admin UI
    ├── M3a-contingut-base.md   # M3a: Contingut base
    ├── M3b-vimeo-upload.md     # M3b: Pujada directa Vimeo
    └── M3c-moderacio-alumnes.md # M3c: Moderació alumnes

hooks/                          # Custom hooks
├── useDebouncedCallback.ts     # Debounce per inputs
├── useVideos.ts                # Gestió de vídeos
└── useVimeoValidation.ts       # Validació Vimeo

lib/
└── vimeo/                      # Utilitats Vimeo
    ├── api.ts                  # Funcions API
    ├── utils.ts                # Utilitats
    └── index.ts                # Exports

supabase/
├── config.toml                 # Configuració local
└── migrations/                 # Migracions de BD (M1)
    └── *.sql                   # Fitxers de migració

utils/
└── supabase/                   # Clients de Supabase
    ├── client.ts               # Client-side
    ├── server.ts               # Server-side
    └── useAuth.ts              # Hook d'autenticació
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

### Funcionalitats
- ✅ **Pujada directa de vídeos** (Protocol Tus per uploads resumibles)
- ✅ Validació de URLs de vídeos en temps real
- ✅ Obtenció automàtica de thumbnails (espera thumbnail real)
- ✅ Extracció de metadades (títol, durada, descripció)
- ✅ Suport per vídeos unlisted (extracció de `vimeo_hash`)
- ✅ Preview del vídeo abans de guardar
- ✅ Sistema de fallback amb oEmbed per a vídeos no llistats

### Configuració necessària
```env
VIMEO_ACCESS_TOKEN=el-teu-token-dacces
```

**Scopes requerits del token:**
- `private` - Accés a vídeos privats
- `upload` - Pujar vídeos
- `video_files` - Accés a fitxers de vídeo
- `public` - Accés a vídeos públics

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

### ✅ Milestone 3a: Contingut Base (M3a)
- ✅ Pàgina de gestió de vídeos
- ✅ Validació en temps real d'URLs de Vimeo
- ✅ Obtenció automàtica de metadades
- ✅ Preview del vídeo abans de guardar
- ✅ Edició de vídeos (Modal reutilitzable)
- ✅ Eliminació de vídeos amb confirmació
- ✅ Sistema de tags globals (multi-selecció)
- ✅ Sistema de hashtags per centre
- ✅ Compartició intercentres
- ✅ Filtres avançats (cerca, tipus, compartits)
- ✅ Paginació amb 24 vídeos per pàgina
- ✅ Grid responsive amb cards de vídeo
- ✅ Thumbnails amb fallback automàtic

### ✅ Milestone 3b: Pujada Directa a Vimeo (M3b) - NOU
- ✅ **Pujada directa de vídeos a Vimeo** des del formulari
- ✅ Protocol Tus per pujades resumibles
- ✅ Barra de progrés de pujada
- ✅ Polling d'estat de processament
- ✅ Detecció de thumbnail real (no placeholder)
- ✅ Extracció automàtica de `vimeo_hash` per vídeos unlisted
- ✅ Botó de submit desactivat durant processament
- ✅ Missatges d'estat clars per l'usuari
- ✅ Suport per formats: mp4, mov, avi, mkv, webm (fins 2GB)

### 🚧 Milestone 3c: Moderació Alumnes (M3c) - PENDENT
- Sistema de moderació per a vídeos d'alumnes
- Workflow d'aprovació per professors

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
- ✅ Gestió de sessions amb Supabase (sessionStorage)
- ✅ Sidebar dinàmic segons rol
- ✅ Header amb indicador de rol
- ✅ Middleware de protecció de rutes

## 🚧 Pròxims Desenvolupaments

- 📋 **M3c**: Moderació de contingut alumnes
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
