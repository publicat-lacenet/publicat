# Integracio Vimeo - PUBLI*CAT

PUBLI*CAT usa Vimeo per allotjar i reproduir videos. El projecte suporta dues entrades: URL existent de Vimeo i pujada directa via Tus.

## Variables

- `VIMEO_ACCESS_TOKEN`: token server-side.
- `MAX_VIDEO_SIZE_MB`: mida maxima de pujada.
- `ALLOWED_VIDEO_FORMATS`: formats permesos.
- `VIMEO_UPLOAD_CHUNK_SIZE_MB`: mida de chunk Tus.

No exposis mai `VIMEO_ACCESS_TOKEN` al client.

## URL Vimeo

Flux:

1. L'usuari introdueix una URL de Vimeo.
2. `app/api/vimeo/validate/route.ts` valida la URL i consulta Vimeo.
3. Es guarden metadades: `vimeo_url`, `vimeo_id`, `vimeo_hash`, `thumbnail_url`, `duration_seconds`.

Regles:

- Conserva `vimeo_hash` per videos unlisted.
- Rebutja URLs no Vimeo o videos no accessibles.
- Les decisions de permisos han de llegir perfil de `public.users`.

## Pujada Directa

Fitxers principals:

- `app/api/vimeo/upload/ticket/route.ts`
- `app/api/vimeo/status/[videoId]/route.ts`
- `app/components/videos/VideoUploader.tsx`
- `app/components/videos/VideoFormModal.tsx`

Flux:

1. Client demana ticket Tus al servidor.
2. Servidor crea ticket a Vimeo amb `VIMEO_ACCESS_TOKEN`.
3. Client puja el fitxer a Vimeo via Tus.
4. Client consulta `/api/vimeo/status/[videoId]`.
5. El video nomes es considera complet quan Vimeo diu que es reproduible i ja hi ha thumbnail real.
6. El formulari guarda metadades i, si escau, `frames_urls`.

## Camps de BD

- `videos.vimeo_url`: URL completa.
- `videos.vimeo_id`: ID Vimeo.
- `videos.vimeo_hash`: hash unlisted.
- `videos.thumbnail_url`: thumbnail Vimeo.
- `videos.duration_seconds`: durada.
- `videos.frames_urls`: fotogrames per mode anunci/slideshow.

## Seguretat i Deute

- Els endpoints Vimeo han de validar rol (`admin_global`, `editor_profe`, `editor_alumne`) i bloquejar `display`.
- No registrar en logs tokens, links privats, hashes o respostes completes de Vimeo.
- Rate limiting/ownership del flux de pujada continua sent punt a revisar.

## Fora de l'Estat Actual

- Cache local de thumbnails en Storage: no forma part de l'estat verificat actual i s'ha mogut a documentacio obsoleta.
- Webhooks Vimeo: no documentats com a flux actiu.
