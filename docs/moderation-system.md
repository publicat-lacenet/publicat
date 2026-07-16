# Moderacio de videos - PUBLI*CAT

Document viu del flux de moderacio de videos pujats per alumnes.

## Estats

`video_status` real:

- `pending_approval`: pendent de revisio.
- `published`: aprovat i visible segons permisos.
- `needs_revision`: retornat a l'alumne per corregir.

No existeix `rejected` com a valor enum. El rebuig/eliminacio pot existir com a accio o traça (`rejected_at`, `rejected_by_user_id`, `rejection_comment`), pero no com a estat enum.

## Flux Principal

1. `editor_alumne` crea un video.
2. El video queda `pending_approval`.
3. `editor_profe` o `admin_global` revisa el video.
4. Pot aprovar-lo: passa a `published`.
5. Pot demanar revisio: passa a `needs_revision` amb `rejection_comment`.
6. L'alumne corregeix el video i el reenvia: torna a `pending_approval`.

Els videos creats per `editor_profe` o `admin_global` poden entrar directament com `published`.

## Permisos

- `editor_profe`: pot veure i moderar videos del seu centre.
- `admin_global`: pot moderar globalment.
- `editor_alumne`: pot veure els seus videos pendents/en revisio i corregir nomes els seus `needs_revision`.
- `display`: sense permisos de moderacio.

## Notificacions

Funcions/triggers relacionats:

- `notify_pending_video`
- `notify_video_approved`
- `notify_video_rejected`
- `notify_video_needs_revision`
- `notify_video_resubmitted`

Pendent verificat:

- En una revisio anterior hi havia videos `needs_revision` sense notificacions `video_needs_revision`.
- Cal validar el trigger i decidir si cal backfill de notificacions.

## UI Actual Esperada

- Professors/admins veuen pendents i poden aprovar o demanar revisio.
- Alumnes veuen un avís/badge quan tenen videos en `needs_revision`.
- El formulari de video permet mode correccio per a l'alumne propietari.

## Punts Oberts

- Prova funcional completa amb sessions reals per cada rol.
- Decidir si el rebuig ha de ser eliminacio, desactivacio o traça auditada.
- Alinear notificacions amb `needs_revision`.
