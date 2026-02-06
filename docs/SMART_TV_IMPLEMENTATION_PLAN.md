# Pla d'Implementació: Compatibilitat Smart TV

**Data**: 2026-02-06
**Estat**: Pendent d'implementació

## Context

La pantalla de display (`/pantalla`) utilitza el SDK `@vimeo/player` que té problemes documentats amb navegadors de Smart TVs, especialment webOS (LG).

**Referència**: https://github.com/vimeo/player.js/issues/571

## Objectiu

Crear una versió alternativa del reproductor Vimeo que utilitzi iframe directe, més compatible amb Smart TVs, mantenint la mateixa experiència visual.

## Pla d'Implementació

### Pas 1: Crear VimeoPlayerUniversal.tsx

**Ubicació**: `app/components/display/VimeoPlayerUniversal.tsx`

```tsx
'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

export interface VimeoPlayerUniversalProps {
  vimeoId: string;
  vimeoHash?: string | null;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  background?: boolean;
  volume?: number;
  onReady?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

export interface VimeoPlayerUniversalHandle {
  // Simplified interface - only essential methods
}

const VimeoPlayerUniversal = forwardRef<VimeoPlayerUniversalHandle, VimeoPlayerUniversalProps>(({
  vimeoId,
  vimeoHash,
  autoplay = true,
  muted = true,
  loop = false,
  background = true,
  onReady,
  onEnded,
  onError,
  className = '',
}, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Build Vimeo player URL
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    muted: muted ? '1' : '0',
    loop: loop ? '1' : '0',
    background: background ? '1' : '0',
    dnt: '1',
  });

  if (vimeoHash) {
    params.set('h', vimeoHash);
  }

  const src = `https://player.vimeo.com/video/${vimeoId}?${params.toString()}`;

  // Listen for postMessage events from Vimeo iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://player.vimeo.com') return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        if (data.event === 'ready') {
          onReady?.();
        } else if (data.event === 'ended') {
          onEnded?.();
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onReady, onEnded]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      className={`w-full h-full ${className}`}
      style={{ border: 'none' }}
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      onLoad={() => onReady?.()}
      onError={() => onError?.(new Error('Failed to load Vimeo player'))}
    />
  );
});

VimeoPlayerUniversal.displayName = 'VimeoPlayerUniversal';

export default VimeoPlayerUniversal;
```

### Pas 2: Modificar VideoZone.tsx

Afegir prop `useUniversalPlayer` per poder canviar entre versions:

```tsx
// A VideoZone.tsx, afegir:
interface VideoZoneProps {
  // ... existing props
  useUniversalPlayer?: boolean;
}

// Dins del component, canviar el renderitzat:
{useUniversalPlayer ? (
  <VimeoPlayerUniversal
    vimeoId={currentVideo.vimeo_id}
    vimeoHash={currentVideo.vimeo_hash}
    autoplay
    muted={muted}
    onEnded={handleVideoEnd}
  />
) : (
  <VimeoPlayer
    vimeoId={currentVideo.vimeo_id}
    // ... existing props
  />
)}
```

### Pas 3: Afegir paràmetre URL a DisplayScreen

```tsx
// A DisplayScreen.tsx, llegir paràmetre:
const searchParams = useSearchParams();
const useUniversalPlayer = searchParams.get('player') === 'universal';

// Passar a VideoZone:
<VideoZone
  // ... existing props
  useUniversalPlayer={useUniversalPlayer}
/>
```

### Pas 4: Test

1. **Desktop**: `/pantalla` (versió actual) vs `/pantalla?player=universal`
2. **Smart TV**: Provar `/pantalla?player=universal` en TV real o emulador

## Fitxers a Modificar

| Fitxer | Acció |
|--------|-------|
| `app/components/display/VimeoPlayerUniversal.tsx` | CREAR |
| `app/components/display/VideoZone.tsx` | MODIFICAR |
| `app/components/display/DisplayScreen.tsx` | MODIFICAR |

## Criteris d'Acceptació

- [ ] La versió `?player=universal` es veu idèntica a l'actual en desktop
- [ ] Els vídeos canvien automàticament quan acaben
- [ ] Funciona en navegador de Smart TV (si es pot testejar)
- [ ] No hi ha errors a la consola

## Notes Addicionals

### CSS a revisar (compatibilitat TV)

Si hi ha problemes visuals, revisar:
- `aspect-ratio` → fallback amb `padding-bottom: 56.25%`
- `line-clamp` → assegurar prefix `-webkit-line-clamp`

### Detecció ended event

L'iframe de Vimeo envia events via postMessage. Si no funciona bé:
1. Usar polling amb `getDuration` (més complex)
2. O simplement usar timer basat en duració coneguda del vídeo

## Comanda per Començar

```
Implementa el pla de Smart TV segons docs/SMART_TV_IMPLEMENTATION_PLAN.md
```
