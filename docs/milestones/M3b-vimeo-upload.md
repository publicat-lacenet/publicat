# M3b: Vimeo Upload Direct

**Durada estimada:** 1 setmana  
**Dependències:** M3a completat (Contingut Base)  
**Risc:** 🟡 Mitjà (Integració amb Tus Protocol + Vimeo API)

---

## 📋 Objectiu

Implementar la capacitat de **pujar vídeos directament des del formulari** utilitzant el protocol **Tus (resumable uploads)** de Vimeo, sense necessitat de pujar-los primer manualment a Vimeo i després enganxar l'URL.

---

## 🎯 Criteris d'Acceptació

- [x] Access Token de Vimeo amb permisos d'escriptura (`upload` amb `private`, `public`, `video_files`)
- [ ] Selector de fitxer al formulari amb drag & drop
- [ ] Validació de format (mp4, mov, avi) i mida màxima (configurable, per defecte 2GB)
- [ ] Barra de progrés visual durant la pujada
- [ ] Suport per pujades resumables (Tus protocol)
- [ ] Gestió d'errors amb retry automàtic
- [ ] Cancel·lació de pujada en curs
- [ ] Metadades Vimeo autocompletades després de la pujada
- [ ] Thumbnail generat automàticament per Vimeo
- [ ] Opció de mantenir URL manual per compatibilitat
- [ ] Vídeos pujats configurats automàticament com "unlisted" (ocults)
- [ ] Tracking de l'estat de processament del vídeo a Vimeo

---

## 🔄 Workflow de Pujada

```
┌─────────────────────────────────────────────────────────────┐
│  Editor selecciona fitxer local                              │
│  (drag & drop o selector)                                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Validació local:                                            │
│  - Format suportat (mp4, mov, avi, mkv)                     │
│  - Mida < 2GB (configurable)                                │
│  - Durada < 60 min (opcional)                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Crear upload ticket a Vimeo:                                │
│  POST /me/videos                                             │
│  {                                                           │
│    "upload": {                                               │
│      "approach": "tus",                                      │
│      "size": file_size                                       │
│    },                                                        │
│    "name": "Títol provisional",                             │
│    "privacy": { "view": "unlisted" }                        │
│  }                                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Pujada amb Tus protocol:                                    │
│  - Upload en chunks (5-10MB)                                 │
│  - Barra de progrés actualitzada                            │
│  - Retry automàtic en error                                 │
│  - Resumable si es talla connexió                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Polling de l'estat del vídeo:                              │
│  GET /videos/{video_id}                                      │
│  - "uploading" → Mostrar spinner                            │
│  - "transcoding" → Mostrar "Processant..."                  │
│  - "available" → Vídeo llest!                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Autocompletar metadades al formulari:                      │
│  - vimeo_url                                                 │
│  - thumbnail_url                                             │
│  - duration_seconds                                          │
│  - vimeo_id                                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Usuari completa formulari i guarda                          │
│  (igual que el flux actual amb URL manual)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Canvis a la Base de Dades

### Taula `videos` (sense canvis)

El camp `vimeo_url` i `thumbnail_url` ja existeixen, només cal omplir-los amb la URL generada per Vimeo després de la pujada.

### Opcional: Taula `upload_progress` (per gestió avançada)

Si volem fer tracking detallat dels uploads en curs:

```sql
CREATE TABLE upload_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  bytes_uploaded BIGINT DEFAULT 0,
  vimeo_upload_link TEXT,
  vimeo_video_id TEXT,
  status TEXT CHECK (status IN ('uploading', 'transcoding', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_upload_progress_user_status ON upload_progress(user_id, status);
```

**Nota:** Aquesta taula és **opcional**. Per MVP podem fer-ho tot al client sense persistir l'estat.

---

## 🔧 Configuració Tècnica

### 1. Verificar Access Token de Vimeo

**✅ Token ja configurat amb els permisos necessaris:**
- ✅ `public` (llegir vídeos públics)
- ✅ `private` (llegir vídeos privats)
- ✅ `video_files` (metadades completes)
- ✅ **`upload`** (pujar i crear vídeos)

**Nota:** El scope `upload` ja inclou la capacitat de crear vídeos nous i editar-ne les metadades bàsiques.

**Token actual:** Configurat el 7 de gener de 2026

Si per algun motiu cal regenerar el token:
1. Accedir a https://developer.vimeo.com/apps
2. Editar l'aplicació "Publicat Integration"
3. Generar un nou Access Token amb els mateixos scopes
4. Actualitzar `.env.local` i variables de producció

### 2. Instal·lar Client Tus

```bash
npm install tus-js-client
```

### 3. Configurar límits de pujada

Al fitxer de configuració del projecte (o `.env`):
```env
MAX_VIDEO_SIZE_MB=2048
ALLOWED_VIDEO_FORMATS=mp4,mov,avi,mkv,webm
VIMEO_UPLOAD_CHUNK_SIZE_MB=10
```

---

## 📦 Implementació Backend

### API Route: Crear Upload Ticket

**Fitxer:** `app/api/vimeo/upload/ticket/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'No autenticat' }, { status: 401 });
  }
  
  try {
    const { file_size, file_name } = await request.json();
    
    if (!file_size || file_size <= 0) {
      return NextResponse.json(
        { error: 'Mida de fitxer invàlida' },
        { status: 400 }
      );
    }
    
    const MAX_SIZE = parseInt(process.env.MAX_VIDEO_SIZE_MB || '2048') * 1024 * 1024;
    if (file_size > MAX_SIZE) {
      return NextResponse.json(
        { error: `El fitxer supera la mida màxima de ${MAX_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }
    
    // Crear ticket d'upload a Vimeo
    const response = await fetch('https://api.vimeo.com/me/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.vimeo.*+json;version=3.4',
      },
      body: JSON.stringify({
        upload: {
          approach: 'tus',
          size: file_size,
        },
        name: file_name || 'Vídeo sense títol',
        description: 'Pujat des de Publicat',
        privacy: {
          view: 'unlisted', // Ocult per defecte
          embed: 'public',
        },
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Error Vimeo API:', error);
      return NextResponse.json(
        { error: 'Error creant upload ticket a Vimeo' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      upload_link: data.upload.upload_link,
      video_uri: data.uri,
      video_id: data.uri.split('/').pop(),
    });
    
  } catch (error) {
    console.error('Error creating Vimeo upload ticket:', error);
    return NextResponse.json(
      { error: 'Error de servidor' },
      { status: 500 }
    );
  }
}
```

---

### API Route: Comprovar Estat del Vídeo

**Fitxer:** `app/api/vimeo/status/[videoId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  const videoId = params.videoId;
  
  try {
    const response = await fetch(`https://api.vimeo.com/videos/${videoId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
        'Accept': 'application/vnd.vimeo.*+json;version=3.4',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Vídeo no trobat' },
        { status: 404 }
      );
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      status: data.status,
      transcode_status: data.transcode?.status || 'unknown',
      is_playable: data.status === 'available',
      link: data.link,
      thumbnail: data.pictures?.sizes?.find((s: any) => s.width === 640)?.link || '',
      duration: data.duration || 0,
    });
    
  } catch (error) {
    console.error('Error checking Vimeo video status:', error);
    return NextResponse.json(
      { error: 'Error de servidor' },
      { status: 500 }
    );
  }
}
```

---

## 🎨 Implementació Frontend

### Component: VideoUploader

**Fitxer:** `app/components/videos/VideoUploader.tsx`

```typescript
'use client';

import { useState, useRef } from 'react';
import * as tus from 'tus-js-client';

interface VideoUploaderProps {
  onUploadComplete: (vimeoUrl: string, metadata: VimeoMetadata) => void;
  onError: (error: string) => void;
}

interface VimeoMetadata {
  video_id: string;
  thumbnail_url: string;
  duration: number;
}

export default function VideoUploader({ onUploadComplete, onError }: VideoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete'>('idle');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<tus.Upload | null>(null);
  
  const handleFileSelect = async (file: File) => {
    if (!file) return;
    
    // Validar format
    const allowedFormats = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    if (!allowedFormats.includes(file.type)) {
      onError('Format no suportat. Utilitza mp4, mov, avi o mkv');
      return;
    }
    
    // Validar mida
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxSize) {
      onError('El fitxer supera els 2GB');
      return;
    }
    
    setFileName(file.name);
    setUploading(true);
    setStatus('uploading');
    setProgress(0);
    
    try {
      // 1. Obtenir ticket d'upload de Vimeo
      const ticketRes = await fetch('/api/vimeo/upload/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_size: file.size,
          file_name: file.name,
        }),
      });
      
      if (!ticketRes.ok) {
        const error = await ticketRes.json();
        throw new Error(error.error || 'Error creant upload ticket');
      }
      
      const { upload_link, video_id } = await ticketRes.json();
      
      // 2. Pujar fitxer amb Tus
      const upload = new tus.Upload(file, {
        endpoint: upload_link,
        uploadUrl: upload_link,
        chunkSize: 10 * 1024 * 1024, // 10MB chunks
        retryDelays: [0, 1000, 3000, 5000],
        metadata: {
          filename: file.name,
          filetype: file.type,
        },
        onError: (error) => {
          console.error('Error durant la pujada:', error);
          onError('Error pujant el vídeo. Si us plau, torna-ho a intentar.');
          setUploading(false);
          setStatus('idle');
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          setProgress(percentage);
        },
        onSuccess: async () => {
          console.log('Pujada completada!');
          setStatus('processing');
          
          // 3. Polling per esperar que Vimeo processi el vídeo
          await pollVideoStatus(video_id);
        },
      });
      
      uploadRef.current = upload;
      upload.start();
      
    } catch (error: any) {
      console.error('Error:', error);
      onError(error.message || 'Error inesperat');
      setUploading(false);
      setStatus('idle');
    }
  };
  
  const pollVideoStatus = async (videoId: string) => {
    const maxAttempts = 60; // 5 minuts màxim
    let attempts = 0;
    
    const poll = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        onError('Timeout: el vídeo està trigant massa a processar-se');
        setUploading(false);
        setStatus('idle');
        return;
      }
      
      try {
        const res = await fetch(`/api/vimeo/status/${videoId}`);
        const data = await res.json();
        
        if (data.is_playable) {
          // Vídeo llest!
          const vimeoUrl = data.link;
          const metadata: VimeoMetadata = {
            video_id: videoId,
            thumbnail_url: data.thumbnail,
            duration: data.duration,
          };
          
          setStatus('complete');
          setUploading(false);
          onUploadComplete(vimeoUrl, metadata);
          
        } else {
          // Encara processant, retry en 5 segons
          attempts++;
          setTimeout(poll, 5000);
        }
        
      } catch (error) {
        console.error('Error checking video status:', error);
        attempts++;
        setTimeout(poll, 5000);
      }
    };
    
    poll();
  };
  
  const handleCancel = () => {
    if (uploadRef.current) {
      uploadRef.current.abort();
      uploadRef.current = null;
    }
    setUploading(false);
    setStatus('idle');
    setProgress(0);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  return (
    <div className="space-y-4">
      {!uploading ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#16AFAA] transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />
          <div className="text-gray-600">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-sm">Arrossega un vídeo aquí o fes clic per seleccionar</p>
            <p className="mt-1 text-xs text-gray-500">MP4, MOV, AVI o MKV (màx. 2GB)</p>
          </div>
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{fileName}</span>
            {status === 'uploading' && (
              <button
                onClick={handleCancel}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Cancel·lar
              </button>
            )}
          </div>
          
          {status === 'uploading' && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#16AFAA] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 text-center">{progress}% pujat</p>
            </>
          )}
          
          {status === 'processing' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16AFAA] mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Processant vídeo a Vimeo...</p>
            </div>
          )}
          
          {status === 'complete' && (
            <div className="text-center text-green-600">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="mt-2 text-sm font-medium">Vídeo pujat correctament!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

### Integració amb VideoFormModal

**Actualitzar:** `app/components/videos/VideoFormModal.tsx`

```typescript
import VideoUploader from './VideoUploader';

// Afegir estat per alternar entre URL manual i upload
const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('url');

// Handler per quan es completa l'upload
const handleUploadComplete = (vimeoUrl: string, metadata: VimeoMetadata) => {
  setVimeoUrl(vimeoUrl);
  setIsVimeoValid(true);
  setVimeoMetadata({
    vimeo_id: metadata.video_id,
    thumbnail_url: metadata.thumbnail_url,
    duration: metadata.duration,
    title: title || 'Vídeo sense títol',
  });
};

// Al JSX, afegir toggle i component
{!isEditMode && (
  <div className="space-y-4">
    {/* Toggle entre URL manual i upload */}
    <div className="flex gap-2 border-b border-gray-200">
      <button
        type="button"
        onClick={() => setUploadMode('url')}
        className={`px-4 py-2 text-sm font-medium border-b-2 ${
          uploadMode === 'url'
            ? 'border-[#16AFAA] text-[#16AFAA]'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        URL de Vimeo
      </button>
      <button
        type="button"
        onClick={() => setUploadMode('upload')}
        className={`px-4 py-2 text-sm font-medium border-b-2 ${
          uploadMode === 'upload'
            ? 'border-[#16AFAA] text-[#16AFAA]'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        Pujar fitxer
      </button>
    </div>
    
    {uploadMode === 'url' ? (
      <VimeoUrlInput
        value={vimeoUrl}
        onChange={setVimeoUrl}
        onValidationChange={handleVimeoValidation}
      />
    ) : (
      <VideoUploader
        onUploadComplete={handleUploadComplete}
        onError={(error) => alert(`❌ ${error}`)}
      />
    )}
  </div>
)}
```

---

## 🧪 Testing

### Tests de Validació Local
- [ ] Validar format correcte (mp4, mov, avi, mkv)
- [ ] Rebutjar formats no suportats (avi, flv)
- [ ] Rebutjar fitxers > 2GB
- [ ] Drag & drop funciona correctament
- [ ] Selector de fitxer funciona

### Tests d'Upload
- [ ] Pujada de vídeo petit (10MB) completa correctament
- [ ] Pujada de vídeo gran (500MB) amb barra de progrés funcional
- [ ] Cancel·lació d'upload en curs
- [ ] Retry automàtic després d'error de xarxa
- [ ] Pujada resumable després de desconnexió

### Tests de Processament
- [ ] Polling espera correctament que Vimeo processi el vídeo
- [ ] Thumbnail es carrega correctament
- [ ] Durada s'extreu correctament
- [ ] Vídeo pujat es pot reproduir

### Tests d'Integració
- [ ] Vídeo pujat es guarda correctament a la BD
- [ ] Vídeo apareix al llistat de contingut
- [ ] Vídeo es pot editar després de pujar-lo
- [ ] Vídeo es pot compartir amb altres centres

---

## 📊 Mètriques d'Èxit

- ✅ Temps mitjà de pujada per vídeo de 100MB < 2 minuts
- ✅ Taxa d'èxit d'uploads > 95%
- ✅ Temps de processament de Vimeo < 5 minuts per vídeos < 500MB
- ✅ 0 vídeos corruptes o sense thumbnail

---

## 🚀 Desplegament

### Checklist Pre-Deploy

- [x] Access Token de Vimeo amb permisos d'escriptura (ja configurat)
- [ ] Variables d'entorn configurades a producció
- [ ] Llibreria `tus-js-client` instal·lada
- [ ] API routes desplegades i funcionals
- [ ] Component VideoUploader integrat al formulari
- [ ] Tests manuals completats amb èxit

### Configuració de Producció

```env
# Vercel Environment Variables
VIMEO_ACCESS_TOKEN=your_production_token_with_upload_scopes
MAX_VIDEO_SIZE_MB=2048
ALLOWED_VIDEO_FORMATS=mp4,mov,avi,mkv
VIMEO_UPLOAD_CHUNK_SIZE_MB=10
```

---

## 🔄 Rollback Plan

Si hi ha problemes amb l'upload directe:
1. Mantenir l'opció d'URL manual sempre disponible
2. Deshabilitar temporalment el botó "Pujar fitxer" amb un missatge
3. Revertir canvis si és necessari (no hi ha canvis a la BD)

---

## 📚 Recursos

- [Vimeo Upload API Documentation](https://developer.vimeo.com/api/upload/videos)
- [Tus Protocol Specification](https://tus.io/protocols/resumable-upload.html)
- [tus-js-client GitHub](https://github.com/tus/tus-js-client)
- [Vimeo API Reference](https://developer.vimeo.com/api/reference)

---

## 🎯 Pròxims Passos (Post-M3b)

Un cop completat M3b, el següent milestone serà **M3c: Moderació Alumnes**, que permetrà als alumnes pujar vídeos amb aprovació dels professors.

**Beneficis de fer M3b abans de M3c:**
- Els alumnes podran pujar vídeos directament (millor UX)
- Menys friccions en el procés de moderació
- Sistema més autònom i professional
