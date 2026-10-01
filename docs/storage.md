# Storage - PUBLI*CAT

Document viu de Supabase Storage. Substitueix el document antic mogut a `docs/OBSOLET/storage.md`.

## Estat Verificat

Verificacio del 2026-07-10:

- Buckets detectats: `announcement-frames` i `center-logos`.
- `announcement-frames` es public.
- `center-logos` es public, limita els fitxers a 2 MB i admet PNG, JPG/JPEG i WebP.
- No s'han detectat policies visibles a `storage.objects`.

No es consideren actius altres buckets antics o proposats fins que es verifiquin i es documentin de nou.

## Logos de centre

La migració local `20260710120000_center_logos.sql` defineix el bucket `center-logos`:

- És públic només per servir les imatges als displays i a la interfície.
- Admet PNG, JPG/JPEG i WebP, amb un màxim de 2 MB.
- No té polítiques d'escriptura client-side a `storage.objects`: les càrregues, substitucions i neteges passen per l'API de servidor amb `service_role`, després de validar el rol a `public.users`.
- Els objectes es guarden sota el prefix del seu `center_id`.

## Us Actual

El bucket `announcement-frames` s'utilitza per fotogrames extrets de videos d'anunci/slideshow:

- El client extreu fotogrames.
- Intenta pujar-los a Supabase Storage.
- Les URL publiques es guarden a `videos.frames_urls`.
- En esborrar un video, l'API intenta netejar els fitxers associats.

## Riscos

- Sense policies visibles a `storage.objects`, la pujada client-side pot fallar o dependre d'una configuracio externa no documentada.
- El bucket es public; qualsevol URL guardada a `frames_urls` s'ha de considerar publica.
- El flux actual pot fallar silenciosament sense trencar la creacio del video.

## Decisio Pendent

Cal triar una de dues vies:

- Crear policies Storage segures per `announcement-frames`, amb ownership i MIME/mida restringits.
- Moure la pujada/esborrat de fotogrames a endpoints server-side amb `service_role`.

Fins que aquesta decisio es tanqui, no documentis `announcement-frames` com a flux segur complet.

## Reparació de captures d'anuncis — 2026-10-01

La decisió pendent descrita més amunt es resol amb `POST /api/videos/[id]/frames`, després de validar sessió, perfil actiu, tipus d'anunci i permisos de rol/centre/propietari. El client extreu JPEG únicament quan es desa un anunci amb fitxer nou; la pujada i la persistència passen pel servidor. Storage conserva RLS i no s'obre escriptura client-side.

Límits: 30 captures, 640x360, 128 KiB per JPEG. La persistència comprova que el vídeo no ha canviat i neteja lots fallits o substituïts del mateix vídeo. Errors visibles al formulari; miniatura quan no hi ha captures o quan una captura falla. No hi ha generació retrospectiva ni eliminació d'anuncis antics. La prova de pujada completa autenticada queda pendent d'un anunci nou d'un usuari després del desplegament autoritzat.

La verificació de juliol del principi és històrica: el projecte té també el bucket privat `zoom-materials`, verificat l'1 d'octubre. Les captures eren 0 abans de la reparació. Vegeu MEMORIA_PROJECTE.md i docs/revisio-2026-10-01.md per evidències i estat de desplegament.
