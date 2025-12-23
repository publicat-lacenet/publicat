# Integració amb Vimeo — Publicat

## 1) Visió General

Publicat utilitza **Vimeo** com a plataforma d'emmagatzematge i streaming de vídeos. La integració es fa **directament via API** per obtenir validació automàtica, thumbnails i metadades des del primer moment.

**Flux bàsic:**
1. L'usuari enganxa una URL de Vimeo al formulari
2. El sistema extreu el Video ID i valida amb l'API de Vimeo
3. Autocompletació de metadades (thumbnail, títol, durada)
4. Reproducció via iframe embegut de Vimeo

---

## 2) Configuració Inicial

### 2.1 Crear App a Vimeo

1. Accedir a https://developer.vimeo.com/apps/new
2. Crear aplicació amb nom **"Publicat Integration"**
3. Generar **Access Token** amb scopes:
   - `public` (vídeos públics)
   - `private` (vídeos privats del centre)
   - `video_files` (metadades completes)

### 2.2 Variables d'Entorn

Afegir a `.env.local` (desenvolupament) i configuració de producció:

```env
VIMEO_ACCESS_TOKEN=your_token_here
```

**Seguretat:** No cometre mai aquest token al repositori. Utilitzar Vercel Environment Variables o similar en producció.

---

## 3) Entrada i Validació d'URL

### 3.1 Formats d'URL Suportats

```
https://vimeo.com/123456789
https://vimeo.com/123456789/abc123def
https://player.vimeo.com/video/123456789
```

### 3.2 Extracció del Video ID

```typescript
// lib/vimeo/utils.ts
export function extractVimeoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /vimeo\.com\/video\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  
  return null
}
```

### 3.3 Validació del Format

```typescript
export function isValidVimeoUrl(url: string): boolean {
  return extractVimeoId(url) !== null
}
```

---

## 4) API de Vimeo

### 4.1 Obtenir Metadades

**Endpoint:**
```
GET https://api.vimeo.com/videos/{video_id}
```

**Headers:**
```
Authorization: Bearer {access_token}
Accept: application/vnd.vimeo.*+json;version=3.4
```

**Exemple de resposta:**
```json
{
  "uri": "/videos/123456789",
  "name": "Títol del vídeo",
  "description": "Descripció completa",
  "duration": 125,
  "pictures": {
    "sizes": [
      { "width": 640, "height": 360, "link": "https://i.vimeocdn.com/..." },
      { "width": 1280, "height": 720, "link": "https://i.vimeocdn.com/..." }
    ]
  },
  "privacy": {
    "view": "anybody"  // anybody | nobody | disable | unlisted | password
  },
  "status": "available",
  "created_time": "2025-01-15T10:30:00+00:00"
}
```

### 4.2 Funció Utility

```typescript
// lib/vimeo/api.ts
interface VimeoVideoData {
  title: string
  description: string | null
  thumbnail: string
  duration: number
  isAccessible: boolean
  privacy: string
}

export async function getVimeoVideoData(
  videoId: string
): Promise<VimeoVideoData> {
  const response = await fetch(
    `https://api.vimeo.com/videos/${videoId}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
        'Accept': 'application/vnd.vimeo.*+json;version=3.4'
      },
      next: { revalidate: 3600 } // Cache 1 hora en Next.js
    }
  )
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('VIDEO_NOT_FOUND')
    }
    if (response.status === 403) {
      throw new Error('VIDEO_PRIVATE')
    }
    throw new Error('VIMEO_API_ERROR')
  }
  
  const data = await response.json()
  
  // Seleccionar millor thumbnail (640px width)
  const thumbnail = data.pictures.sizes.find(s => s.width === 640)?.link 
    || data.pictures.sizes[0]?.link
  
  return {
    title: data.name,
    description: data.description || null,
    thumbnail,
    duration: data.duration,
    isAccessible: data.privacy.view === 'anybody',
    privacy: data.privacy.view
  }
}
```

---

## 5) API Route (Backend)

### 5.1 Endpoint de Validació

```typescript
// app/api/vimeo/validate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { extractVimeoId } from '@/lib/vimeo/utils'
import { getVimeoVideoData } from '@/lib/vimeo/api'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    // Validar format URL
    const videoId = extractVimeoId(url)
    if (!videoId) {
      return NextResponse.json(
        { error: 'URL de Vimeo no vàlida' },
        { status: 400 }
      )
    }
    
    // Obtenir metadades de Vimeo
    const data = await getVimeoVideoData(videoId)
    
    return NextResponse.json({
      videoId,
      ...data
    })
    
  } catch (error) {
    if (error.message === 'VIDEO_NOT_FOUND') {
      return NextResponse.json(
        { error: 'El vídeo no existeix a Vimeo' },
        { status: 404 }
      )
    }
    
    if (error.message === 'VIDEO_PRIVATE') {
      return NextResponse.json(
        { error: 'El vídeo és privat i no es pot reproduir' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Error de connexió amb Vimeo' },
      { status: 500 }
    )
  }
}
```

---

## 6) Hook de Frontend

### 6.1 Custom Hook per Validació

```typescript
// hooks/useVimeoValidation.ts
import { useState } from 'react'

interface VimeoValidationResult {
  videoId: string
  title: string
  thumbnail: string
  duration: number
  isAccessible: boolean
}

export function useVimeoValidation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const validate = async (url: string): Promise<VimeoValidationResult | null> => {
    if (!url) return null
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/vimeo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      
      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error)
      }
      
      const data = await response.json()
      return data
      
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }
  
  return { validate, loading, error }
}
```

---

## 7) Integració en Formulari de Vídeo

### 7.1 Exemple amb React Hook Form

```typescript
// components/VideoForm.tsx
import { useVimeoValidation } from '@/hooks/useVimeoValidation'
import { useForm } from 'react-hook-form'

export function VideoForm() {
  const form = useForm()
  const { validate, loading, error } = useVimeoValidation()
  
  const handleVimeoUrlBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const url = e.target.value
    if (!url) return
    
    const data = await validate(url)
    
    if (data) {
      // Autocompletar camps
      form.setValue('vimeoVideoId', data.videoId)
      form.setValue('thumbnailUrl', data.thumbnail)
      form.setValue('duration', data.duration)
      
      // Suggerir títol si el camp està buit
      if (!form.getValues('title')) {
        form.setValue('title', data.title)
      }
      
      // Alertar si no és accessible
      if (!data.isAccessible) {
        alert('Atenció: aquest vídeo és privat i pot no reproduir-se correctament')
      }
    }
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input
        label="URL de Vimeo"
        placeholder="https://vimeo.com/123456789"
        {...form.register('vimeoUrl')}
        onBlur={handleVimeoUrlBlur}
        disabled={loading}
      />
      
      {loading && <Spinner />}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      <Input
        label="Títol"
        {...form.register('title', { required: true })}
      />
      
      {/* Camps ocults */}
      <input type="hidden" {...form.register('vimeoVideoId')} />
      <input type="hidden" {...form.register('thumbnailUrl')} />
      <input type="hidden" {...form.register('duration')} />
      
      <Button type="submit">Guardar</Button>
    </form>
  )
}
```

---

## 8) Reproductor de Vídeo

### 8.1 Iframe Embegut

```typescript
// components/VimeoPlayer.tsx
interface VimeoPlayerProps {
  videoId: string
  autoplay?: boolean
  muted?: boolean
  controls?: boolean
  loop?: boolean
}

export function VimeoPlayer({
  videoId,
  autoplay = false,
  muted = false,
  controls = true,
  loop = false
}: VimeoPlayerProps) {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    muted: muted ? '1' : '0',
    controls: controls ? '1' : '0',
    loop: loop ? '1' : '0',
    background: !controls ? '1' : '0'
  })
  
  return (
    <div className="aspect-video w-full">
      <iframe
        src={`https://player.vimeo.com/video/${videoId}?${params}`}
        className="w-full h-full"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
```

### 8.2 Configuració per Mode Display

```typescript
// Mode Display (TV) - Reproducció automàtica sense controls
<VimeoPlayer
  videoId={video.vimeoVideoId}
  autoplay={true}
  muted={false}
  controls={false}
  loop={false}
/>

// Mode Editor - Amb controls
<VimeoPlayer
  videoId={video.vimeoVideoId}
  autoplay={false}
  controls={true}
/>
```

---

## 9) Esquema de Base de Dades

### 9.1 Camps a `videos` table

```sql
CREATE TABLE videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Vimeo
  vimeo_url text NOT NULL,
  vimeo_video_id text NOT NULL,
  thumbnail_url text,
  duration_seconds int,
  
  -- Metadades
  title text NOT NULL,
  description text,
  
  -- ... altres camps
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index per vimeo_video_id per evitar duplicats
CREATE UNIQUE INDEX idx_videos_vimeo_id ON videos(vimeo_video_id);
```

---

## 10) Gestió d'Errors

### 10.1 Codis d'Error

| Error | Causa | Missatge UI |
|-------|-------|-------------|
| `VIDEO_NOT_FOUND` | Vídeo no existeix o ha estat eliminat | "El vídeo no existeix a Vimeo" |
| `VIDEO_PRIVATE` | Vídeo privat sense permisos | "El vídeo és privat i no es pot reproduir" |
| `INVALID_URL` | Format URL incorrecte | "URL de Vimeo no vàlida" |
| `VIMEO_API_ERROR` | Error temporal de Vimeo | "Error de connexió, torna-ho a provar" |
| `RATE_LIMIT` | Massa peticions | "Massa peticions, espera un moment" |

### 10.2 Feedback Visual

```typescript
// components/VimeoUrlInput.tsx
{error && (
  <Alert variant="error">
    <AlertIcon />
    <AlertTitle>Error de validació</AlertTitle>
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}

{data && !data.isAccessible && (
  <Alert variant="warning">
    <AlertIcon />
    <AlertDescription>
      Aquest vídeo té configuració de privacitat restringida
    </AlertDescription>
  </Alert>
)}
```

---

## 11) Caché i Optimització

### 11.1 Caché HTTP de Next.js

```typescript
// Configuració automàtica a Next.js 14+
fetch(url, {
  next: { revalidate: 3600 } // Cache 1 hora
})
```

### 11.2 Caché amb React Query (opcional)

```typescript
// queries/vimeoQueries.ts
import { useQuery } from '@tanstack/react-query'

export function useVimeoVideo(videoId: string) {
  return useQuery({
    queryKey: ['vimeo', videoId],
    queryFn: () => fetchVimeoMetadata(videoId),
    staleTime: 1000 * 60 * 60, // 1 hora
    cacheTime: 1000 * 60 * 60 * 24, // 24 horas
    retry: 2
  })
}
```

---

## 12) Rate Limiting

### 12.1 Límits de Vimeo

- **Free/Plus:** ~10 requests/minut
- **Pro/Business:** ~100 requests/minut

### 12.2 Estratègia

Per a un ús normal (editors introduint URLs una a una), els límits són **més que suficients**.

**Optimitzacions opcionals:**
- Caché agressiva (1 hora o més)
- Validació lazy (només al guardar, no en temps real)
- Batch validation per vídeos existents (background job)

---

## 13) Testing

### 13.1 URLs de Test

Utilitzar aquests vídeos públics de Vimeo per proves:

```
https://vimeo.com/148751763  // Vídeo públic de mostra
https://vimeo.com/76979871   // The New Vimeo Player
```

### 13.2 Casos de Test

```typescript
// __tests__/vimeo.test.ts
describe('Vimeo Integration', () => {
  test('extreu ID correctament', () => {
    expect(extractVimeoId('https://vimeo.com/123456')).toBe('123456')
    expect(extractVimeoId('invalid')).toBeNull()
  })
  
  test('valida vídeo existent', async () => {
    const data = await getVimeoVideoData('148751763')
    expect(data.title).toBeDefined()
    expect(data.thumbnail).toBeDefined()
  })
  
  test('error per vídeo inexistent', async () => {
    await expect(getVimeoVideoData('999999999'))
      .rejects.toThrow('VIDEO_NOT_FOUND')
  })
})
```

---

## 14) Millores Futures (Fora d'Abast Inicial)

### 14.1 Emmagatzematge de Thumbnails

**Problema actual:** Les URLs de thumbnails de Vimeo poden caducar.

**Solució futura:**
- Descarregar thumbnail al validar
- Pujar a Supabase Storage bucket `video-thumbnails/`
- Guardar URL pública de Supabase a BD

### 14.2 Webhooks de Vimeo

Per notificacions automàtiques:
- `video.delete` → Marcar vídeo com a no disponible
- `video.privacy.update` → Revalidar accessibilitat

### 14.3 Subida Directa

Permetre pujar fitxer des de Publicat directament a Vimeo (via TUS protocol).

---

## 15) Checklist d'Implementació

- [ ] Obtenir Access Token de Vimeo
- [ ] Afegir `VIMEO_ACCESS_TOKEN` a variables d'entorn
- [ ] Crear `lib/vimeo/utils.ts` amb `extractVimeoId()`
- [ ] Crear `lib/vimeo/api.ts` amb `getVimeoVideoData()`
- [ ] Crear API route `/api/vimeo/validate`
- [ ] Crear hook `useVimeoValidation`
- [ ] Integrar en formulari de vídeo amb validació onBlur
- [ ] Crear component `VimeoPlayer` amb modes display/editor
- [ ] Afegir camps `vimeo_video_id` i `thumbnail_url` a taula `videos`
- [ ] Testing manual amb vídeos de prova
- [ ] Documentar errors comuns per usuaris

---

## 16) Referències

- [Vimeo API Reference](https://developer.vimeo.com/api/reference)
- [Vimeo Player SDK](https://developer.vimeo.com/player/sdk)
- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [React Hook Form](https://react-hook-form.com/)

---

**Temps estimat d'implementació:** 2-3 hores (incloent testing)
