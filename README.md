# PUBLI*CAT

**PUBLI*CAT** és una plataforma web multi-centre per gestionar, organitzar i mostrar contingut audiovisual educatiu. El projecte permet als centres treballar amb vídeos de Vimeo, llistes de reproducció, feeds RSS i pantalles informatives de vestíbul amb control de rols i permisos.

Aquest README descriu l'estat actual del repositori. El README anterior s'ha conservat a `docs/README-historic.md`.

## Estat Actual

El projecte ja disposa dels blocs principals implementats:

- Administració global de centres, zones i usuaris.
- Autenticació amb Supabase Auth, invitacions i recuperació de contrasenya.
- Gestió de vídeos amb URL de Vimeo i pujada directa a Vimeo via Tus.
- Moderació de vídeos pujats per alumnes.
- Tags globals, hashtags de centre, filtres i compartició intercentres.
- Llistes de reproducció amb drag and drop i calendari d'assignacions.
- Mode pantalla/display amb vídeo principal, anuncis i RSS.
- Gestió de feeds RSS, configuració i ordre de rotació.
- Landing pública amb playlist global.
- Gestió d'usuaris del centre per part d'editors professor.
- Revisió de seguretat aplicada sobre RLS, secrets, Vimeo i headers.

El roadmap actual apunta principalment a millores com convidats temporals, auditoria, logs, notificacions in-app i evolucions de producte.

## Stack

- **Framework:** Next.js 16, App Router, Turbopack
- **Llenguatge:** TypeScript
- **UI:** React 19, Tailwind CSS 4, lucide-react
- **Base de dades:** Supabase PostgreSQL
- **Auth:** Supabase Auth i `@supabase/ssr`
- **Video:** Vimeo API, `@vimeo/player`, `tus-js-client`
- **RSS:** `rss-parser`
- **Drag and drop:** `@dnd-kit`
- **Deploy:** Vercel

## Requisits

- Node.js 20+
- npm
- Projecte Supabase configurat
- Token de Vimeo amb scopes `private`, `upload`, `video_files`, `public`
- Projecte Vercel per producció

## Posada en Marxa

Instal·la dependències:

```bash
npm install
```

Copia `.env.example` a `.env.local` i omple els valors:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...
VIMEO_ACCESS_TOKEN=...
CRON_SECRET=...
MAX_VIDEO_SIZE_MB=2048
ALLOWED_VIDEO_FORMATS=mp4,mov,avi,mkv,webm
VIMEO_UPLOAD_CHUNK_SIZE_MB=10
```

Executa el servidor de desenvolupament:

```bash
npm run dev
```

Obre `http://localhost:3000`.

## Scripts

```bash
npm run dev      # Servidor de desenvolupament
npm run build    # Build de producció
npm run start    # Servidor de producció
npm run lint     # ESLint
```

Actualment no hi ha una suite de tests automatitzada definida. Per canvis de codi, com a mínim executa `npm run lint`; per canvis d'abast mitjà o alt, executa també `npm run build`.

## Estructura del Projecte

```text
app/
  api/                 Endpoints JSON de l'aplicació
  admin/               Administració global
  auth/                Callbacks i fluxos d'autenticació
  components/          Components UI, layout, vídeos, playlists, RSS i display
  contingut/           Gestió de vídeos
  dashboard/           Entrada autenticada
  llistes/             Gestió de llistes de reproducció
  login/               Inici de sessió
  pantalla/            Mode display/pantalla
  perfil/              Perfil d'usuari
  reset-password/      Recuperació de contrasenya
  rss/                 Gestió de feeds RSS
  usuaris/             Gestió d'usuaris del centre
  visor/               Previsualització de pantalla

hooks/                 Hooks de React reutilitzables
lib/                   Lògica compartida, Vimeo, hashtags i display
public/                Logos i assets públics
supabase/migrations/   Migracions SQL versionades
utils/supabase/        Clients Supabase server/client i auth helpers
docs/                  Documentació funcional, tècnica i UI
```

## Rols

- `admin_global`: control global del sistema, centres, zones, usuaris, llistes globals i landing.
- `editor_profe`: gestiona vídeos, llistes, RSS i usuaris del seu centre.
- `editor_alumne`: pot pujar vídeos pendents d'aprovació i editar llistes marcades com editables per alumnes.
- `display`: accedeix al mode passiu de pantalla.

Els permisos s'han de mantenir alineats entre UI, API routes i RLS. No n'hi ha prou amb amagar controls a la interfície.

## Fluxos Principals

### Vídeos

- Alta per URL de Vimeo amb validació i metadades.
- Pujada directa a Vimeo amb Tus i seguiment de processament.
- Guardat de `vimeo_id` i `vimeo_hash` per vídeos unlisted.
- Tags globals obligatoris i hashtags opcionals per centre.
- Compartició intercentres controlada per editors professor i admin global.

### Moderació

- Els vídeos pujats per `editor_alumne` entren com `pending_approval`.
- `editor_profe` i `admin_global` poden aprovar, editar o rebutjar.
- Les notificacions existeixen a nivell de base de dades; la UI de notificacions queda com a millora.

### Llistes i Pantalla

- Les llistes agrupen vídeos ordenats.
- Hi ha llistes de dies, anuncis, personalitzades i globals.
- El calendari (`schedule_overrides`) permet assignar llistes a dates concretes.
- El mode display combina vídeo principal, anuncis, ticker i RSS.

### RSS

- Gestió de feeds per centre.
- Validació de feeds.
- Configuració de durada per item/feed i ordre de rotació.
- Actualització via endpoint cron protegit amb `CRON_SECRET`.

## Base de Dades i Migracions

Les migracions es guarden a `supabase/migrations/`, però no s'apliquen amb Supabase CLI en el flux habitual del projecte.

Flux actual:

1. Crear una migració nova amb prefix cronològic `YYYYMMDDHHmmss`.
2. Copiar el SQL al Supabase SQL Editor.
3. Executar manualment la migració.
4. Documentar canvis rellevants a `docs/`.

No editis migracions antigues que representin historial ja aplicat. Per l'estat real de la base de dades, consulta `docs/DB-AUDIT-REPORT.md`.

## Documentació de Referència

- `AGENTS.md`: guia operativa per a agents i mantenidors.
- `roadmap.md`: estat i evolució de milestones.
- `docs/overview.md`: visió general del producte.
- `docs/domain-model.md`: model de domini.
- `docs/roles.md`: rols i permisos.
- `docs/database.schema.md`: esquema de base de dades.
- `docs/DB-AUDIT-REPORT.md`: auditoria de la base de dades.
- `docs/vimeo-integration.md`: integració amb Vimeo.
- `docs/rss-system.md`: sistema RSS.
- `docs/ui/guia-estil.md`: guia visual.

## UI i Identitat

Colors principals:

- Groc: `#FEDD2C`
- Magenta: `#F91248`
- Turquesa: `#16AFAA`
- Fons clar: `#F9FAFB`
- Text: `#111827`

La UI fa servir Montserrat per títols, Inter per text i icones de `lucide-react`.

## Deploy

Producció:

```text
https://publicat-lovat.vercel.app
```

La branca `main` es desplega automàticament a Vercel. Les variables d'entorn de producció s'han de configurar al dashboard de Vercel.

## Llicència

Projecte intern de Lacenet per a centres educatius.
