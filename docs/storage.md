# Emmagatzematge d'Arxius — Publicat

## 1) Visió General

Publicat utilitza **Supabase Storage** per gestionar arxius estàtics:
- **Logos de centres** (pujats per administradors)
- **Thumbnails de vídeos** (caché opcional de thumbnails de Vimeo)

Supabase Storage proporciona:
- ✅ URLs públiques per a imatges
- ✅ Integració nativa amb RLS (Row Level Security)
- ✅ CDN automàtic
- ✅ Transformacions d'imatge (redimensionament, optimització)

---

## 2) Estructura de Buckets

### 2.1 Bucket: `center-logos`

**Propòsit:** Emmagatzemar els logos dels centres educatius.

**Estructura de carpetes:**
```
center-logos/
  {center_id}/
    logo.png
    logo.jpg
    logo.svg
```

**Exemple:**
```
center-logos/
  abc123-def-456/
    logo.png
  xyz789-ghi-012/
    logo.svg
```

**Configuració:**
- **Public:** ✅ Sí (els logos es mostren a tothom)
- **File size limit:** 2MB
- **Allowed MIME types:** `image/png`, `image/jpeg`, `image/svg+xml`, `image/webp`

### 2.2 Bucket: `video-thumbnails` (opcional)

**Propòsit:** Caché de thumbnails de Vimeo per evitar dependència d'URLs externes.

**Estructura de carpetes:**
```
video-thumbnails/
  {center_id}/
    {video_id}.jpg
    {video_id}.webp
```

**Exemple:**
```
video-thumbnails/
  abc123-def-456/
    video-001.jpg
    video-002.jpg
  xyz789-ghi-012/
    video-003.jpg
```

**Configuració:**
- **Public:** ✅ Sí (thumbnails es mostren a tothom)
- **File size limit:** 1MB
- **Allowed MIME types:** `image/jpeg`, `image/webp`

**Nota:** Aquest bucket és **opcional** en la implementació inicial. Només cal si es vol caché persistent de thumbnails.

---

## 3) Creació de Buckets

### 3.1 Via Dashboard de Supabase

1. Anar a **Storage** al dashboard de Supabase
2. Click **"New bucket"**
3. Configurar:
   - Name: `center-logos`
   - Public: ✅ Yes
   - File size limit: 2000000 (2MB)
   - Allowed MIME types: `image/png,image/jpeg,image/svg+xml,image/webp`

4. Repetir per `video-thumbnails` amb límit d'1MB

### 3.2 Via SQL Migration

```sql
-- Crear bucket per logos de centres
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'center-logos',
  'center-logos',
  true,
  2000000,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
);

-- Crear bucket per thumbnails (opcional)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-thumbnails',
  'video-thumbnails',
  true,
  1000000,
  ARRAY['image/jpeg', 'image/webp']
);
```

---

## 4) Polítiques de Seguretat (RLS)

### 4.1 Políticas para `center-logos`

**Lectura pública (tothom pot veure logos):**
```sql
CREATE POLICY "Public read access for center logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'center-logos');
```

**Escriptura per administradors globals:**
```sql
CREATE POLICY "Admin global can upload center logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'center-logos'
  AND auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'admin_global' AND is_active = true
  )
);
```

**Actualització/esborrat per administradors globals:**
```sql
CREATE POLICY "Admin global can update/delete center logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'center-logos'
  AND auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'admin_global' AND is_active = true
  )
);

CREATE POLICY "Admin global can delete center logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'center-logos'
  AND auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'admin_global' AND is_active = true
  )
);
```

### 4.2 Políticas para `video-thumbnails`

**Lectura pública:**
```sql
CREATE POLICY "Public read access for thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'video-thumbnails');
```

**Escriptura per backend (service role):**
```sql
-- No es necessita policy explícita si s'utilitza service_role key des del backend
-- Alternativamente, per editors del centre:
CREATE POLICY "Editors can upload thumbnails for their center"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'video-thumbnails'
  AND (storage.foldername(name))[1] IN (
    SELECT center_id::text FROM public.users WHERE id = auth.uid()
  )
);
```

---

## 5) API d'Upload (Frontend)

### 5.1 Upload de Logo de Centre

```typescript
// lib/storage/uploadCenterLogo.ts
import { createClient } from '@/utils/supabase/client'

export async function uploadCenterLogo(
  centerId: string,
  file: File
): Promise<string> {
  const supabase = createClient()
  
  // Validar tipus d'arxiu
  const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Tipus d\'arxiu no permès. Utilitza PNG, JPG, SVG o WebP.')
  }
  
  // Validar mida (2MB màxim)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('L\'arxiu és massa gran. Mida màxima: 2MB.')
  }
  
  // Generar nom d'arxiu amb extensió correcta
  const extension = file.name.split('.').pop()
  const fileName = `${centerId}/logo.${extension}`
  
  // Pujar arxiu
  const { data, error } = await supabase.storage
    .from('center-logos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true // Sobreescriure si ja existeix
    })
  
  if (error) throw error
  
  // Obtenir URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('center-logos')
    .getPublicUrl(fileName)
  
  return publicUrl
}
```

### 5.2 Component d'Upload

```typescript
// components/CenterLogoUpload.tsx
import { useState } from 'react'
import { uploadCenterLogo } from '@/lib/storage/uploadCenterLogo'

interface CenterLogoUploadProps {
  centerId: string
  currentLogoUrl?: string
  onUploadSuccess: (url: string) => void
}

export function CenterLogoUpload({
  centerId,
  currentLogoUrl,
  onUploadSuccess
}: CenterLogoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(currentLogoUrl || null)
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Preview local
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    
    // Upload
    setUploading(true)
    setError(null)
    
    try {
      const url = await uploadCenterLogo(centerId, file)
      onUploadSuccess(url)
    } catch (err) {
      setError(err.message)
      setPreview(currentLogoUrl || null)
    } finally {
      setUploading(false)
    }
  }
  
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">
        Logo del centre
      </label>
      
      {preview && (
        <div className="w-32 h-32 relative border rounded-lg overflow-hidden">
          <img
            src={preview}
            alt="Logo preview"
            className="w-full h-full object-contain"
          />
        </div>
      )}
      
      <input
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onChange={handleFileChange}
        disabled={uploading}
        className="block w-full text-sm"
      />
      
      {uploading && <p className="text-sm text-gray-500">Pujant...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      
      <p className="text-xs text-gray-500">
        PNG, JPG, SVG o WebP. Màxim 2MB.
      </p>
    </div>
  )
}
```

---

## 6) Integració amb Formulari de Centre

### 6.1 Actualització de la Taula `centers`

```typescript
// Quan es crea o edita un centre
const handleSubmit = async (formData) => {
  let logoUrl = formData.logoUrl // URL actual
  
  // Si hi ha un nou fitxer, pujar-lo primer
  if (selectedFile) {
    logoUrl = await uploadCenterLogo(centerId, selectedFile)
  }
  
  // Guardar/actualitzar centre amb la nova URL
  const { error } = await supabase
    .from('centers')
    .upsert({
      id: centerId,
      name: formData.name,
      zone_id: formData.zoneId,
      logo_url: logoUrl,
      is_active: formData.isActive
    })
  
  if (error) throw error
}
```

---

## 7) Caché de Thumbnails de Vimeo (Opcional)

### 7.1 Quan Implementar-ho

**NO és necessari inicialment** si:
- Els thumbnails de Vimeo funcionen correctament
- No hi ha problemes de latència
- Les URLs de Vimeo són estables

**SÍ és recomanable si:**
- Es vol independència total de Vimeo
- Es vol optimització d'imatges (WebP, redimensionament)
- Es detecten problemes amb URLs de Vimeo

### 7.2 Implementació

```typescript
// lib/storage/cacheThumbnail.ts
import { createClient } from '@/utils/supabase/server'

export async function cacheVimeoThumbnail(
  centerId: string,
  videoId: string,
  vimeoThumbnailUrl: string
): Promise<string> {
  const supabase = createClient()
  
  // Descarregar thumbnail de Vimeo
  const response = await fetch(vimeoThumbnailUrl)
  const blob = await response.blob()
  
  // Pujar a Supabase Storage
  const fileName = `${centerId}/${videoId}.jpg`
  const { error } = await supabase.storage
    .from('video-thumbnails')
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
      cacheControl: '86400', // Cache 24h
      upsert: true
    })
  
  if (error) throw error
  
  // Obtenir URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('video-thumbnails')
    .getPublicUrl(fileName)
  
  return publicUrl
}
```

### 7.3 Integració amb Validació de Vimeo

```typescript
// Modificar getVimeoVideoData per caché automàtic
export async function getVimeoVideoData(videoId: string, centerId?: string) {
  const data = await fetchFromVimeoAPI(videoId)
  
  let thumbnailUrl = data.pictures.sizes[0].link
  
  // Si tenim centerId, caché el thumbnail
  if (centerId) {
    try {
      thumbnailUrl = await cacheVimeoThumbnail(centerId, videoId, thumbnailUrl)
    } catch (err) {
      // Si falla, utilitzar URL de Vimeo com a fallback
      console.error('Error caching thumbnail:', err)
    }
  }
  
  return {
    ...data,
    thumbnail: thumbnailUrl
  }
}
```

---

## 8) Transformacions d'Imatge

### 8.1 Redimensionament Automàtic

Supabase Storage suporta transformacions via URL:

```typescript
// Obtenir thumbnail redimensionat
const { data } = supabase.storage
  .from('center-logos')
  .getPublicUrl('abc123/logo.png', {
    transform: {
      width: 200,
      height: 200,
      resize: 'contain'
    }
  })

// URL resultant:
// https://<project>.supabase.co/storage/v1/render/image/public/center-logos/abc123/logo.png?width=200&height=200
```

### 8.2 Exemples d'Ús

```typescript
// Logo petit per menú lateral
<img src={getLogoUrl(centerId, { width: 64, height: 64 })} />

// Logo gran per pantalla principal
<img src={getLogoUrl(centerId, { width: 300, height: 100 })} />

// Thumbnail optimitzat per targeta
<img src={getThumbnailUrl(videoId, { width: 640, quality: 80, format: 'webp' })} />
```

---

## 9) Esborrat d'Arxius

### 9.1 Esborrar Logo Antic

Quan s'actualitza el logo d'un centre:

```typescript
// lib/storage/deleteCenterLogo.ts
export async function deleteCenterLogo(centerId: string, oldLogoUrl: string) {
  const supabase = createClient()
  
  // Extreure el path de la URL
  const path = oldLogoUrl.split('/center-logos/')[1]
  if (!path) return
  
  await supabase.storage
    .from('center-logos')
    .remove([path])
}

// Ús en actualització
if (oldLogoUrl && oldLogoUrl !== newLogoUrl) {
  await deleteCenterLogo(centerId, oldLogoUrl)
}
```

### 9.2 Esborrat en Cascada

Quan s'esborra un centre (si es permet):

```sql
-- Trigger per esborrar logos automàticament
CREATE OR REPLACE FUNCTION delete_center_logo()
RETURNS TRIGGER AS $$
BEGIN
  -- Aquesta funció s'hauria d'implementar amb una Edge Function
  -- que cridi a l'API de Storage per esborrar arxius
  PERFORM net.http_post(
    url := current_setting('app.storage_cleanup_url'),
    body := json_build_object('center_id', OLD.id, 'logo_url', OLD.logo_url)::text
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_center_delete
AFTER DELETE ON centers
FOR EACH ROW
EXECUTE FUNCTION delete_center_logo();
```

Alternativament, fer la neteja manualment en el codi d'aplicació.

---

## 10) Límits i Quotes

### 10.1 Límits de Supabase Storage

| Pla | Storage Total | Transferència/mes |
|-----|---------------|-------------------|
| **Free** | 1 GB | 2 GB |
| **Pro** | 100 GB | 200 GB |
| **Team** | 100 GB | 200 GB |
| **Enterprise** | Il·limitat | Il·limitat |

### 10.2 Estimació d'Ús

**Per 50 centres:**
- Logos: ~50 × 200 KB = 10 MB
- Thumbnails (opcional): 50 centres × 100 vídeos × 100 KB = 500 MB

**Total: ~510 MB** (molt per sota del límit de Free tier)

### 10.3 Monitorització

```sql
-- Query per veure ús d'emmagatzematge
SELECT
  bucket_id,
  COUNT(*) as file_count,
  SUM(metadata->>'size')::bigint as total_bytes,
  pg_size_pretty(SUM(metadata->>'size')::bigint) as total_size
FROM storage.objects
GROUP BY bucket_id;
```

---

## 11) Gestió d'Errors

### 11.1 Errors Comuns

| Error | Causa | Solució |
|-------|-------|---------|
| `Payload too large` | Arxiu > límit del bucket | Comprimir imatge abans de pujar |
| `Invalid mime type` | Tipus d'arxiu no permès | Validar tipus abans d'upload |
| `Unauthorized` | Usuari sense permisos | Verificar rol i políticas RLS |
| `Bucket not found` | Bucket no creat | Executar migrations per crear buckets |

### 11.2 Validació Client-Side

```typescript
// Validar abans de pujar
function validateImageFile(file: File): string | null {
  const maxSize = 2 * 1024 * 1024 // 2MB
  const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
  
  if (!allowedTypes.includes(file.type)) {
    return 'Tipus d\'arxiu no vàlid. Utilitza PNG, JPG, SVG o WebP.'
  }
  
  if (file.size > maxSize) {
    return 'L\'arxiu és massa gran. Mida màxima: 2MB.'
  }
  
  return null // Tot correcte
}
```

---

## 12) Optimització d'Imatges

### 12.1 Compressió Abans d'Upload

```typescript
// lib/storage/compressImage.ts
export async function compressImage(file: File, maxWidth: number = 1200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    img.onload = () => {
      let width = img.width
      let height = img.height
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      canvas.width = width
      canvas.height = height
      
      ctx?.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Compression failed'))
      }, 'image/jpeg', 0.85)
    }
    
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
```

### 12.2 Ús en Upload

```typescript
const handleUpload = async (file: File) => {
  // Comprimir si és massa gran
  let fileToUpload = file
  if (file.size > 500 * 1024) { // Si > 500KB
    fileToUpload = await compressImage(file)
  }
  
  const url = await uploadCenterLogo(centerId, fileToUpload)
  return url
}
```

---

## 13) Testing

### 13.1 Test d'Upload

```typescript
// __tests__/storage.test.ts
describe('Storage Upload', () => {
  test('puja logo de centre correctament', async () => {
    const mockFile = new File(['test'], 'logo.png', { type: 'image/png' })
    const url = await uploadCenterLogo('test-center-id', mockFile)
    
    expect(url).toContain('center-logos/test-center-id/logo.png')
  })
  
  test('rebutja arxius massa grans', async () => {
    const largeFile = new File([new ArrayBuffer(3 * 1024 * 1024)], 'large.png', {
      type: 'image/png'
    })
    
    await expect(uploadCenterLogo('test-id', largeFile))
      .rejects.toThrow('massa gran')
  })
})
```

---

## 14) Checklist d'Implementació

**Configuració inicial:**
- [ ] Crear bucket `center-logos` al dashboard de Supabase
- [ ] Configurar políticas RLS per logos
- [ ] (Opcional) Crear bucket `video-thumbnails`

**Backend:**
- [ ] Crear utility `uploadCenterLogo()`
- [ ] Crear utility `deleteCenterLogo()`
- [ ] Validació de tipus i mida d'arxiu

**Frontend:**
- [ ] Component `CenterLogoUpload`
- [ ] Integrar en formulari de centres
- [ ] Preview d'imatge abans d'upload
- [ ] Gestió d'errors amb feedback visual

**Testing:**
- [ ] Provar upload de diferents formats (PNG, JPG, SVG)
- [ ] Verificar límits de mida
- [ ] Comprovar políticas RLS (qui pot pujar/esborrar)

---

## 15) Referències

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)
- [Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations)

---

**Temps estimat d'implementació:** 2-3 hores (incloent configuració i testing)
