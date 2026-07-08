# AGENTS.md

Guia canonica per a agents que treballin en aquest repositori. Aquest projecte es diu **PUBLI*CAT**: una plataforma multi-centre per gestionar videos educatius de Vimeo, playlists, RSS i pantalles informatives per a centres educatius.

`AGENTS.md` es la font operativa principal per a agents. `README.md` i `docs/` son documentacio de suport. Si alguna informacio antiga contradiu aquest fitxer, preval aquest fitxer i despres la documentacio especifica dins `docs/`.

## Abans de tocar codi

- Llegeix primer aquest `AGENTS.md` i `README.md`.
- Per canvis de domini consulta `docs/overview.md`, `docs/domain-model.md` i `docs/roles.md`.
- Per base de dades consulta sempre `docs/DB-AUDIT-REPORT.md` i les migracions de `supabase/migrations/`.
- Per UI consulta `docs/ui/guia-estil.md` i, si escau, el document de pantalla dins `docs/ui/`.
- Respecta canvis locals existents. No facis revert ni neteges de fitxers no relacionats.
- Mantingues els missatges d'error de cara a usuari en catala quan el context ja ho sigui.

## Comandes habituals

```bash
npm run dev
npm run build
npm run start
npm run lint
```

No hi ha una suite de tests automatitzada definida. Com a verificacio minima, executa `npm run lint`; per canvis de Next/Supabase o d'abast mitja/alt, executa tambe `npm run build` quan sigui raonable.

## GitHub i comptes

Aquest repositori GitHub es `publicat-lacenet/publicat` i s'ha de treballar amb el compte GitHub `publicat-lacenet`.

En aquesta maquina es treballa amb diversos projectes i diversos comptes GitHub. Cada vegada que entris o tornis a aquest projecte despres d'haver treballat en un altre repositori, no assumeixis que la configuracio global encara es correcta: comprova i restaura explicitament el remot, el compte GitHub actiu i la identitat Git local d'aquest checkout.

Comprovacio minima en tornar a aquest projecte:

```powershell
git remote -v
git config --local --get user.name
git config --local --get user.email
gh auth switch -h github.com -u publicat-lacenet
gh auth status
```

La configuracio esperada es:

```text
origin = https://github.com/publicat-lacenet/publicat.git
user.name = publicat-lacenet
user.email = publicat@xtec.cat
gh active account = publicat-lacenet
```

Si `origin` no apunta a aquest repositori, corregeix-lo abans de fer cap operacio GitHub:

```powershell
git remote set-url origin https://github.com/publicat-lacenet/publicat.git
```

Si la identitat Git local no es la d'aquest projecte, corregeix-la abans de fer commits:

```powershell
git config --local user.name publicat-lacenet
git config --local user.email publicat@xtec.cat
```

Abans de fer qualsevol operacio amb GitHub, especialment `git push`, `gh repo ...`, PRs o comprovacions de permisos, comprova que el compte actiu sigui el correcte:

```powershell
gh auth switch -h github.com -u publicat-lacenet
gh auth status
```

Si `gh auth switch` o `gh auth status` indiquen que el token es invalid, que el compte no esta autenticat, o que cal iniciar sessio de nou, demana a l'usuari que reautentiqui el compte amb:

```powershell
gh auth login -h github.com -p https -w
```

Durant el login, l'usuari ha d'iniciar sessio al navegador amb el compte `publicat-lacenet`. No facis servir `gh auth login -u publicat-lacenet`, perque `gh auth login` no accepta el flag `-u`; el compte es selecciona autenticant-se al navegador amb l'usuari correcte. Despres de completar el login, torna a executar:

```powershell
gh auth switch -h github.com -u publicat-lacenet
gh auth status
```

Abans de fer `git push`, verifica tambe l'autor i el committer de l'ultim commit:

```powershell
git log -1 --format="author=%an <%ae>%ncommitter=%cn <%ce>"
```

No facis `git push` si `gh auth status` no mostra `publicat-lacenet` com a compte actiu i autenticat, si `origin` no apunta a `publicat-lacenet/publicat`, o si l'autor/committer del commit que vols pujar no son `publicat-lacenet <publicat@xtec.cat>`. En aquesta maquina hi pot haver altres comptes GitHub autenticats per altres projectes; canvia de compte explicitament quan canviis de repositori.

Si un commit local s'ha creat amb la identitat equivocada i encara no s'ha publicat, corregeix primer la identitat local i despres amenda'l:

```powershell
git commit --amend --reset-author --no-edit
```

## Variables d'entorn

El projecte necessita, segons l'entorn:

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

No guardis tokens dins del repo. Si apareix un token temporal com `token.txt` o similar, usa'l nomes per autenticar/verificar i elimina'l immediatament.

## Stack i arquitectura

- Next.js 16 amb App Router, `proxy.ts` i TypeScript estricte.
- React 19, Tailwind CSS 4 i components propis a `app/components/`.
- Supabase per autenticacio, PostgreSQL i RLS.
- Vimeo API i `tus-js-client` per validacio i pujada directa de videos.
- RSS amb `rss-parser`.
- Drag and drop amb `@dnd-kit`.
- Vercel com a plataforma de desplegament.

Estructura clau:

- `app/`: rutes, pagines, layouts i API routes.
- `app/api/`: endpoints JSON REST-like.
- `app/components/`: components UI, layout, videos, playlists, RSS i display.
- `hooks/`: hooks reutilitzables.
- `lib/`: logica de domini compartida, especialment Vimeo, hashtags i display.
- `utils/supabase/`: clients Supabase server/client i helpers d'auth.
- `supabase/migrations/`: migracions SQL versionades.
- `docs/`: especificacio funcional, tecnica i UI.
- `public/`: logos i assets publics.

## Estat funcional del projecte

Blocs principals implementats:

- Administracio global de centres, zones i usuaris.
- Autenticacio amb Supabase Auth, invitacions i recuperacio de contrasenya.
- Gestio de videos amb URL de Vimeo i pujada directa via Tus.
- Moderacio de videos pujats per alumnes.
- Tags globals, hashtags de centre, filtres i comparticio intercentres.
- Llistes de reproduccio amb drag and drop i calendari d'assignacions.
- Mode pantalla/display amb video principal, anuncis, ticker i RSS.
- Gestio de feeds RSS, configuracio i ordre de rotacio.
- Landing publica amb playlist global.
- Gestio d'usuaris del centre per part d'editors professor.

## Patrons de Supabase

Server Components i API routes:

```ts
import { createClient } from '@/utils/supabase/server'

const supabase = await createClient()
```

Client Components:

```ts
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()
```

En API routes:

- Verifica l'usuari amb `supabase.auth.getUser()`.
- Per rol i centre, prioritza la taula `users` per sobre de metadata d'Auth.
- No facis servir `user_metadata` per decisions d'autoritzacio.
- Aplica comprovacions server-side encara que `proxy.ts` protegeixi la ruta.
- Retorna JSON amb `NextResponse.json(...)`.
- Usa el `service_role` nomes al servidor i nomes quan sigui necessari.
- No exposis mai `SUPABASE_SERVICE_ROLE_KEY` ni cap secret en codi client o variables `NEXT_PUBLIC_*`.

## Connexio Supabase

El projecte Supabase de PUBLI*CAT es `tvsafusrasfzubiujavk` (`publicat_videos`) i el repo esta linkat localment a `supabase/.temp/project-ref`.

Hi ha dos comptes Supabase diferents en aquesta maquina. El perfil persistent de la CLI pot apuntar a un altre projecte (`Tasques_ioc`). Per aquest repo no confiis en `supabase projects list --profile publicat`: s'ha comprovat que pot apuntar al compte de Tasques IOC.

Per PUBLI*CAT, el perfil local `lacenet` ha d'apuntar a `publicat_videos`. Abans de qualsevol comprovacio amb aquest perfil, neteja la variable d'entorn generica `SUPABASE_ACCESS_TOKEN` dins la sessio de PowerShell, perque aquesta variable te prioritat sobre `--profile` i pot fer que la CLI usi el compte equivocat:

```powershell
$env:SUPABASE_ACCESS_TOKEN = $null
supabase projects list --profile lacenet
```

La sortida ha d'incloure `publicat_videos` i `tvsafusrasfzubiujavk`, i ha d'indicar que el projecte esta linkat. Si nomes apareix `Tasques_ioc`, no continuïs: la sessio esta usant el token o el perfil equivocat.

No eliminis ni exposis `SUPABASE_LACENET_ACCESS_TOKEN` si existeix a `.env.local`: es un nom propi del projecte i la CLI no l'agafa automaticament. Serveix per executar comandes CLI de PUBLI*CAT sense tocar la configuracio global. En canvi, evita deixar `SUPABASE_ACCESS_TOKEN` definit de forma global quan es treballa amb dos comptes Supabase, perque sobreescriu els perfils.

Per comandes de BD que fan servir `supabase db ...` (especialment `db push`), no confiis en el perfil global de `C:\Users\Carles\.supabase\profile`: s'ha comprovat que aquest subcomandament pot fallar amb `failed to read profile: Unsupported Config Type ""`. Usa un `HOME` temporal i el token Lacenet de `.env.local`, de manera que no es toca ni es llegeix la configuracio global de Tasques IOC:

```powershell
$tmpHome = 'C:\tmp\supabase-cli-lacenet-home'
New-Item -ItemType Directory -Force -Path (Join-Path $tmpHome '.supabase') | Out-Null
$tokenLine = Get-Content -Path .\.env.local | Where-Object { $_ -match '^\s*SUPABASE_LACENET_ACCESS_TOKEN\s*=' } | Select-Object -Last 1
$token = ($tokenLine -replace '^\s*SUPABASE_LACENET_ACCESS_TOKEN\s*=\s*', '').Trim().Trim('"').Trim("'")
$oldHome = $env:HOME
$oldUserProfile = $env:USERPROFILE
$env:HOME = $tmpHome
$env:USERPROFILE = $tmpHome
$env:SUPABASE_ACCESS_TOKEN = $token
supabase projects list
# executar aqui la comanda Supabase CLI necessaria
$env:SUPABASE_ACCESS_TOKEN = $null
$env:HOME = $oldHome
$env:USERPROFILE = $oldUserProfile
```

En entorns sandbox com Codex, `supabase projects list` o `supabase db query` poden fallar amb `EPERM` intentant escriure `telemetry.json`, fins i tot amb credencials correctes. Si passa, no canviis de projecte ni toquis tokens: repeteix la mateixa comanda fora del sandbox, mantenint `HOME` i `USERPROFILE` apuntant al directori temporal anterior.

Comandes CLI utils quan els permisos son correctes:

```powershell
$env:SUPABASE_ACCESS_TOKEN = $null
supabase projects list --profile lacenet
supabase db query --linked --profile lacenet "select current_database() as database, current_user as user, now() as server_time;"
supabase db advisors --linked --profile lacenet --type security --level warn --fail-on none -o json
```

Per consultes SQL directes tambe funciona `DATABASE_URL` a `.env.local`. Ha de ser la URL del pooler IPv4 amb port `6543`, no la connexio directa IPv6:

```env
DATABASE_URL=postgresql://postgres.tvsafusrasfzubiujavk:...@aws-1-eu-west-3.pooler.supabase.com:6543/postgres
```

Si CLI o MCP fallen per permisos, no insisteixis en bucle: comprova `.env.local` i usa `DATABASE_URL` per consultes SQL de lectura o validacions puntuals.

## Base de dades i migracions

- S'utilitza Supabase CLI per aplicar migracions a PUBLI*CAT, pero sempre amb comprovacio previa del projecte i amb `--dry-run` abans de qualsevol aplicacio real.
- Crea migracions noves amb `supabase migration new <nom_descriptiu>` quan sigui possible; si es crea manualment, posa-les a `supabase/migrations/` amb prefix cronologic `YYYYMMDDHHmmss`.
- No editis migracions existents si ja representen historial aplicat.
- Abans d'aplicar migracions, comprova que la CLI apunta a `publicat_videos` (`tvsafusrasfzubiujavk`) i que no hi ha cap `SUPABASE_ACCESS_TOKEN` global apuntant a un altre compte.
- Per aplicar migracions, usa el flux aillat amb `SUPABASE_LACENET_ACCESS_TOKEN` i `HOME` temporal descrit a "Connexio Supabase":
  - `supabase projects list` ha de mostrar `publicat_videos`.
  - `supabase migration list --linked` ha d'estar coherent amb `supabase/migrations/`.
  - `supabase db push --linked --dry-run` ha de mostrar quines migracions aplicaria, o `Remote database is up to date`.
  - nomes si el `dry-run` es correcte, executa `supabase db push --linked`.
- Si una migracio ja s'ha aplicat manualment pero no consta a `supabase_migrations.schema_migrations`, verifica primer els seus efectes a la BD i nomes llavors usa `supabase migration repair --linked --status applied <version>`.
- El Supabase SQL Editor queda com a fallback manual si el CLI falla o si cal una intervencio controlada que no convingui automatitzar.
- Si canvies schema, RLS, triggers o indexes, actualitza la documentacio rellevant.
- Per l'estat real de la BD, consulta `docs/DB-AUDIT-REPORT.md` i, si cal, inspecciona la BD real.

Punts importants:

- Totes les taules principals han de tenir RLS.
- `videos.zone_id` es deriva del centre.
- Els videos d'alumnes entren com `pending_approval`.
- La landing publica nomes ha de mostrar videos publicats, compartits i dins la playlist global corresponent.
- Les views en esquemes exposats han de ser `security_invoker` o no accessibles a `anon/authenticated`.
- Les funcions `SECURITY DEFINER` han de tenir `search_path` fixat i no han de ser executables per `PUBLIC` si son nomes triggers.
- Evita policies RLS que consultin directament la mateixa taula, especialment `users`, per no causar recursio infinita.

## Rols i permisos

Rols actuals:

- `admin_global`: abast global, administracio completa, llistes globals i Centre Lacenet per defecte.
- `editor_profe`: gestiona contingut, llistes, RSS i usuaris del seu centre.
- `editor_alumne`: pot pujar videos pendents d'aprovacio i editar llistes marcades com a editables per alumnes.
- `display`: mode passiu de pantalla, sense controls d'edicio.

El sistema es multi-tenant per `center_id`. No confiis nomes en la UI per limitar permisos: la logica critica ha de quedar reforcada a API i RLS.

## Auth i proteccio de rutes

- `proxy.ts` protegeix rutes i redireccions segons sessio/rol.
- Les pagines son Server Components per defecte; afegeix `"use client"` nomes quan calgui estat, efectes o interaccio del navegador.
- `/api/auth/me` hidrata la sessio amb el perfil de `public.users`.
- Les operacions d'administracio han de tornar a validar permisos dins l'API route.
- Els usuaris `admin_global` s'assignen automaticament al Centre Lacenet mitjancant trigger si no tenen centre explicit.

## API routes

Convencions:

- Rutes REST-like amb `GET`, `POST`, `PATCH`, `DELETE`.
- Respostes amb `NextResponse.json(...)`.
- Errors d'usuari en catala quan el context del producte sigui catala.
- Validacio de rol i centre al servidor.

Exemples de superficie API:

- `GET /api/videos`
- `POST /api/videos`
- `PATCH /api/videos/[id]`
- `DELETE /api/videos/[id]`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/[id]`
- `DELETE /api/admin/users/[id]`
- `POST /api/admin/users/[id]/resend-invite`
- `POST /api/vimeo/validate`
- `POST /api/vimeo/upload/ticket`
- `GET /api/vimeo/status/[videoId]`
- `GET /api/landing/playlist` public, sense auth
- `POST /api/playlists/[id]/copy`

## Vimeo i videos

Hi ha dos fluxos:

- URL Vimeo: validar URL, extreure metadades i guardar.
- Upload directe: ticket Tus, pujada a Vimeo, polling de processament i espera de thumbnail real.

Fitxers rellevants:

- `lib/vimeo/api.ts`
- `lib/vimeo/utils.ts`
- `app/api/vimeo/validate/route.ts`
- `app/api/vimeo/upload/ticket/route.ts`
- `app/api/vimeo/status/[videoId]/route.ts`
- `app/components/videos/VideoUploader.tsx`
- `app/components/videos/VideoFormModal.tsx`

Conserva `vimeo_id` i `vimeo_hash` per videos unlisted. No marquis una pujada com a completada si Vimeo encara retorna thumbnails placeholder. El sistema suporta formats com `mp4`, `mov`, `avi`, `mkv`, `webm`, amb mida maxima configurada per env.

## UI i estil

- Usa Tailwind i components existents abans de crear-ne de nous.
- Colors de marca: `#FEDD2C`, `#F91248`, `#16AFAA`, `#F9FAFB`, `#111827`.
- Tipografies: Montserrat per headings i Inter per text.
- Icones: usa `lucide-react`; evita emojis a la UI.
- Components UI base a `app/components/ui/` tenen noms en minuscules quan segueixen estil shadcn (`button.tsx`, `card.tsx`, `badge.tsx`, `alert.tsx`).
- Components compostos fan servir PascalCase (`PageHeader.tsx`, `Modal.tsx`, `VideoCard.tsx`).
- Mantingues la navegacio coherent amb `AppSidebar.tsx`: Contingut, Llistes, Visor/Pantalla, RSS, Usuaris, Admin segons rol.
- No introdueixis dependències noves si el patro existent resol el problema.

Components rellevants:

- `app/components/layout/AppSidebar.tsx`
- `app/components/layout/AppHeader.tsx`
- `app/components/layout/AdminLayout.tsx`
- `app/components/landing/LandingVideoPlayer.tsx`
- `app/components/display/VimeoPlayer.tsx`
- `app/components/display/AnnouncementZone.tsx`
- `app/components/videos/VideoFormModal.tsx`
- `app/components/videos/VideoUploader.tsx`
- `app/components/videos/VideoGrid.tsx`
- `app/components/videos/VideoCard.tsx`
- `app/components/videos/VimeoUrlInput.tsx`
- `app/components/videos/TagSelector.tsx`
- `app/components/videos/HashtagInput.tsx`

## Next.js i rutes

- Usa l'alias `@/*` configurat a `tsconfig.json`.
- Les API routes han de seguir convencions REST-like.
- No usis client Supabase de servidor dins Client Components.
- No posis `"use client"` a una pagina o component si no cal.
- Vigila amb majuscules/minuscules de noms de fitxer: pot funcionar a Windows i fallar en produccio.

## Terminologia del projecte

- Centre: centre educatiu, tenant principal.
- Zona: agrupacio geografica de centres.
- Tag: etiqueta global controlada.
- Hashtag: etiqueta lliure especifica de centre.
- Llista/Playlist: col.leccio ordenada de videos.
- Llista global: playlist publica de landing, editable per `admin_global`.
- Compartir: fer un video visible a altres centres.
- Moderacio: aprovacio/rebuig/revisio de videos d'alumnes.
- Schedule override: assignacio de playlist per data concreta en pantalles.

## Documentacio de referencia

- `README.md`: estat actual, posada en marxa i estructura.
- `docs/overview.md`: visio general.
- `docs/domain-model.md`: model de domini.
- `docs/roles.md`: rols i permisos.
- `docs/DB-AUDIT-REPORT.md`: auditoria i estat real conegut de BD.
- `docs/database.schema.md`: esquema de referencia.
- `docs/authentication.md`: fluxos d'autenticacio.
- `docs/vimeo-integration.md`: integracio Vimeo.
- `docs/rss-system.md`: sistema RSS.
- `docs/ui/guia-estil.md`: guia visual.
- `docs/milestones/`: especificacions i historial de milestones.

## Deploy

- Produccio: `https://publicat-lovat.vercel.app`
- Plataforma: Vercel
- Branca: `main` amb desplegament automatic
- Build: `npm run build`
- Variables d'entorn configurades al dashboard de Vercel

## Checklist per canvis

- Revisa docs canoniques abans de modificar domini o permisos.
- Mantingues RLS, API i UI alineats.
- Valida amb rols diferents quan el canvi toca permisos.
- Executa `npm run lint`; executa `npm run build` per canvis d'abast mitja o alt.
- Actualitza docs quan canviis comportament, schema o fluxos importants.
- No introdueixis dependències noves si el patro existent resol el problema.
- Si una eina de Supabase falla per permisos, canvia d'estrategia aviat i documenta el bloqueig.
