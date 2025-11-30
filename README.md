# PUBLI*CAT

Plataforma de vídeo per a centres educatius que permet centralitzar, organitzar i compartir contingut audiovisual educatiu.

## 🎯 Descripció

PUBLI*CAT és una aplicació web desenvolupada amb Next.js que permet als centres educatius:

- 📹 Centralitzar tots els vídeos educatius en un únic espai
- 📺 Crear playlists per a pantalles informatives del centre
- 🔐 Gestionar l'accés amb autenticació segura
- 👥 Convidar i gestionar usuaris del centre

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
├── reset-password/             # Recuperació de contrasenya
│   └── confirm/                # Confirmar nova contrasenya
├── auth/
│   ├── callback/               # Callback d'autenticació
│   └── confirm/                # Confirmació d'invitació
├── pantalla/                   # Dashboard principal
└── api/                        # API routes

documentacion/
└── guia_estil.md              # Guia d'estil del projecte

utils/
└── supabase/                  # Clients de Supabase
    ├── client.ts              # Client-side
    └── server.ts              # Server-side
```

## 🎨 Colors Corporatius

- **Groc principal**: `#FEDD2C`
- **Rosa accent**: `#F91248`
- **Verd/Cian**: `#16AFAA`
- **Fons**: `#F9FAFB`
- **Text**: `#111827`

## 📱 Funcionalitats Implementades

- ✅ Landing page responsive
- ✅ Sistema de login amb email/contrasenya
- ✅ Recuperació de contrasenya per email
- ✅ Sistema d'invitacions per a nous usuaris
- ✅ Callbacks d'autenticació
- ✅ Gestió de sessions amb Supabase

## 🚧 En Desenvolupament

- 🔄 Gestió de vídeos
- 🔄 Creació de playlists
- 🔄 Panel d'administració
- 🔄 Visualització per a pantalles

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
