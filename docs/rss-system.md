# Sistema RSS — Publicat

## 1) Visió General

El sistema RSS permet mostrar notícies i titulars a la **zona RSS** de la pantalla principal, amb rotació automàtica entre múltiples feeds i gestió avançada d'errors.

Característiques clau:
- ✅ **Validació de feeds** abans d'activar-los
- ✅ **Caché intelligent** per rendiment i resiliència
- ✅ **Retry automàtic** amb exponential backoff
- ✅ **Rotació configurable** entre feeds
- ✅ **Gestió d'errors** amb fallback graceful
- ✅ **Actualització periòdica** en background

---

## 2) Model de Dades

### 2.1 Taula: `rss_feeds`

```sql
CREATE TABLE rss_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  
  -- Dades del feed
  name text NOT NULL,
  url text NOT NULL,
  
  -- Estat
  is_active boolean NOT NULL DEFAULT true,
  is_included_in_rotation boolean NOT NULL DEFAULT false,
  
  -- Metadades del feed (cache)
  feed_title text,
  feed_description text,
  feed_image_url text,
  
  -- Control d'errors
  last_fetch_at timestamptz,
  last_fetch_status text, -- 'success' | 'error'
  last_error_message text,
  consecutive_errors int NOT NULL DEFAULT 0,
  
  -- Configuració
  max_items int NOT NULL DEFAULT 10,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_url CHECK (url ~* '^https?://'),
  INDEX idx_rss_feeds_center_id (center_id),
  INDEX idx_rss_feeds_active (is_active, is_included_in_rotation)
);
```

### 2.2 Taula: `rss_items` (Caché)

```sql
CREATE TABLE rss_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id uuid NOT NULL REFERENCES rss_feeds(id) ON DELETE CASCADE,
  
  -- Dades de l'ítem
  guid text NOT NULL, -- ID únic del feed
  title text NOT NULL,
  description text,
  link text NOT NULL,
  pub_date timestamptz,
  image_url text,
  
  -- Control de caché
  fetched_at timestamptz NOT NULL DEFAULT now(),
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE (feed_id, guid),
  INDEX idx_rss_items_feed_id (feed_id),
  INDEX idx_rss_items_pub_date (pub_date DESC)
);
```

### 2.3 Taula: `rss_center_settings`

```sql
CREATE TABLE rss_center_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE UNIQUE,
  
  -- Configuració de timing
  duration_per_item_seconds int NOT NULL DEFAULT 15,
  duration_per_feed_seconds int NOT NULL DEFAULT 120,
  refresh_interval_minutes int NOT NULL DEFAULT 60,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_timings CHECK (
    duration_per_item_seconds > 0 AND
    duration_per_feed_seconds > 0 AND
    refresh_interval_minutes > 0
  )
);
```

### 2.4 Taula: `rss_rotation_order`

```sql
CREATE TABLE rss_rotation_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  feed_id uuid NOT NULL REFERENCES rss_feeds(id) ON DELETE CASCADE,
  position int NOT NULL,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE (center_id, feed_id),
  UNIQUE (center_id, position),
  INDEX idx_rotation_center_position (center_id, position)
);
```

---

## 3) Validació de Feeds

### 3.1 Parser de RSS/Atom

```typescript
// lib/rss/parser.ts
import Parser from 'rss-parser'

interface RSSFeed {
  title: string
  description?: string
  image?: string
  items: RSSItem[]
}

interface RSSItem {
  guid: string
  title: string
  description?: string
  link: string
  pubDate?: Date
  imageUrl?: string
}

const parser = new Parser({
  timeout: 10000, // 10 segons
  headers: {
    'User-Agent': 'Publicat RSS Reader/1.0'
  }
})

export async function parseRSSFeed(url: string): Promise<RSSFeed> {
  try {
    const feed = await parser.parseURL(url)
    
    return {
      title: feed.title || 'Sense títol',
      description: feed.description,
      image: feed.image?.url || feed.itunes?.image,
      items: feed.items.slice(0, 20).map(item => ({
        guid: item.guid || item.link || item.title || crypto.randomUUID(),
        title: item.title || 'Sense títol',
        description: item.contentSnippet || item.description,
        link: item.link || '',
        pubDate: item.pubDate ? new Date(item.pubDate) : undefined,
        imageUrl: item.enclosure?.url || item.itunes?.image
      }))
    }
  } catch (error) {
    throw new Error(`Error parsing RSS feed: ${error.message}`)
  }
}
```

### 3.2 API: Validar Feed abans de Guardar

```typescript
// app/api/rss/validate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { parseRSSFeed } from '@/lib/rss/parser'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    // Validar format URL
    if (!url || !url.match(/^https?:\/\/.+/)) {
      return NextResponse.json(
        { error: 'URL no vàlida' },
        { status: 400 }
      )
    }
    
    // Intentar parsejar el feed
    const feed = await parseRSSFeed(url)
    
    if (!feed.items || feed.items.length === 0) {
      return NextResponse.json(
        { error: 'El feed no conté cap ítem' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      valid: true,
      feedTitle: feed.title,
      feedDescription: feed.description,
      itemCount: feed.items.length,
      preview: feed.items.slice(0, 3)
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}
```

### 3.3 Component: Validació en Temps Real

```typescript
// components/RSSFeedForm.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'

export function RSSFeedForm({ onSubmit, initialData }) {
  const { register, handleSubmit, watch } = useForm({ defaultValues: initialData })
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState(null)
  
  const url = watch('url')
  
  const handleValidate = async () => {
    if (!url) return
    
    setValidating(true)
    setValidation(null)
    
    try {
      const res = await fetch('/api/rss/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setValidation({ success: true, ...data })
      } else {
        setValidation({ success: false, error: data.error })
      }
    } catch (error) {
      setValidation({ success: false, error: 'Error de connexió' })
    } finally {
      setValidating(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Nom del feed
        </label>
        <input
          type="text"
          {...register('name', { required: true })}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">
          URL del feed RSS
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            {...register('url', { required: true })}
            className="flex-1 px-3 py-2 border rounded-lg"
            placeholder="https://example.com/rss"
          />
          <button
            type="button"
            onClick={handleValidate}
            disabled={validating || !url}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {validating ? 'Validant...' : 'Validar'}
          </button>
        </div>
      </div>
      
      {validation && (
        <div className={`p-4 rounded-lg ${
          validation.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {validation.success ? (
            <div>
              <p className="font-medium text-green-800 mb-2">
                ✓ Feed vàlid
              </p>
              <p className="text-sm text-green-700">
                Títol: <strong>{validation.feedTitle}</strong>
              </p>
              <p className="text-sm text-green-700">
                Ítems disponibles: {validation.itemCount}
              </p>
              
              {validation.preview && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-green-800 mb-1">
                    Vista prèvia:
                  </p>
                  <ul className="space-y-1">
                    {validation.preview.map((item, i) => (
                      <li key={i} className="text-xs text-green-600">
                        • {item.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-red-800">
              ✗ {validation.error}
            </p>
          )}
        </div>
      )}
      
      <div className="flex gap-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('is_active')} />
          <span className="text-sm">Actiu</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('is_included_in_rotation')} />
          <span className="text-sm">Incloure a la rotació</span>
        </label>
      </div>
      
      <button
        type="submit"
        className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700"
      >
        Guardar feed
      </button>
    </form>
  )
}
```

---

## 4) Actualització de Feeds (Background Job)

### 4.1 Edge Function per Fetch de Feeds

```typescript
// supabase/functions/fetch-rss-feeds/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Parser from 'https://esm.sh/rss-parser@3.13.0'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  // Obtenir feeds actius que cal actualitzar
  const { data: feeds } = await supabase
    .from('rss_feeds')
    .select('*, center:centers(id)')
    .eq('is_active', true)
    .or(`last_fetch_at.is.null,last_fetch_at.lt.${getRefreshThreshold()}`)
  
  if (!feeds || feeds.length === 0) {
    return new Response(JSON.stringify({ message: 'No feeds to update' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  const parser = new Parser({ timeout: 10000 })
  const results = []
  
  for (const feed of feeds) {
    try {
      // Parse feed
      const parsedFeed = await parser.parseURL(feed.url)
      
      // Actualitzar metadades del feed
      await supabase
        .from('rss_feeds')
        .update({
          feed_title: parsedFeed.title,
          feed_description: parsedFeed.description,
          feed_image_url: parsedFeed.image?.url,
          last_fetch_at: new Date().toISOString(),
          last_fetch_status: 'success',
          last_error_message: null,
          consecutive_errors: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', feed.id)
      
      // Guardar ítems (upsert per GUID)
      const items = parsedFeed.items.slice(0, feed.max_items || 10).map(item => ({
        feed_id: feed.id,
        guid: item.guid || item.link || item.title,
        title: item.title || 'Sense títol',
        description: item.contentSnippet || item.description,
        link: item.link || '',
        pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : null,
        image_url: item.enclosure?.url,
        fetched_at: new Date().toISOString()
      }))
      
      // Esborrar ítems antics d'aquest feed
      await supabase
        .from('rss_items')
        .delete()
        .eq('feed_id', feed.id)
      
      // Inserir nous ítems
      await supabase
        .from('rss_items')
        .insert(items)
      
      results.push({ feedId: feed.id, status: 'success', itemCount: items.length })
      
    } catch (error) {
      // Gestió d'errors amb exponential backoff
      const consecutiveErrors = (feed.consecutive_errors || 0) + 1
      
      await supabase
        .from('rss_feeds')
        .update({
          last_fetch_at: new Date().toISOString(),
          last_fetch_status: 'error',
          last_error_message: error.message,
          consecutive_errors: consecutiveErrors,
          updated_at: new Date().toISOString()
        })
        .eq('id', feed.id)
      
      // Si massa errors consecutius, desactivar automàticament
      if (consecutiveErrors >= 5) {
        await supabase
          .from('rss_feeds')
          .update({ is_active: false })
          .eq('id', feed.id)
      }
      
      results.push({ feedId: feed.id, status: 'error', error: error.message })
    }
  }
  
  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' }
  })
})

function getRefreshThreshold() {
  // Retorna timestamp de fa 1 hora (per defecte)
  const date = new Date()
  date.setHours(date.getHours() - 1)
  return date.toISOString()
}
```

### 4.2 Cron Job per Executar Edge Function

**Configuració a Supabase:**

Dashboard → Database → Cron Jobs:

```sql
-- Executar cada 15 minuts
SELECT cron.schedule(
  'fetch-rss-feeds',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xxx.supabase.co/functions/v1/fetch-rss-feeds',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  );
  $$
);
```

**Alternativa amb Vercel Cron:**

```typescript
// app/api/cron/fetch-rss/route.ts
export async function GET(request: Request) {
  // Verificar token de seguretat
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Executar lògica de fetch
  const results = await fetchAllFeeds()
  
  return Response.json({ success: true, results })
}
```

**Configurar a `vercel.json`:**

```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-rss",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

---

## 5) Estratègia de Caché

### 5.1 Nivells de Caché

**Nivell 1: Base de dades (`rss_items`)**
- Durada: Fins a la propera actualització
- Propòsit: Persistència i offline capability

**Nivell 2: React Query (frontend)**
- Durada: 5 minuts
- Propòsit: Evitar requests repetitius

**Nivell 3: Next.js Cache**
- Durada: 1 hora
- Propòsit: Server-side caching

### 5.2 Hook amb Caché

```typescript
// hooks/useRSSFeeds.ts
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export function useRSSFeeds(centerId: string) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['rss-feeds', centerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rss_feeds')
        .select(`
          *,
          items:rss_items(
            *,
            ORDER BY pub_date DESC
          )
        `)
        .eq('center_id', centerId)
        .eq('is_active', true)
        .eq('is_included_in_rotation', true)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minuts
    cacheTime: 10 * 60 * 1000, // 10 minuts
    refetchInterval: 5 * 60 * 1000 // Refrescar cada 5 minuts
  })
}
```

---

## 6) Component de Visualització RSS

### 6.1 Rotació de Feeds i Ítems

```typescript
// components/RSSDisplay.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRSSFeeds } from '@/hooks/useRSSFeeds'
import { format } from 'date-fns'
import { ca } from 'date-fns/locale'

interface RSSDisplayProps {
  centerId: string
  durationPerItem?: number // segons
  durationPerFeed?: number // segons
}

export function RSSDisplay({
  centerId,
  durationPerItem = 15,
  durationPerFeed = 120
}: RSSDisplayProps) {
  const { data: feeds, isLoading } = useRSSFeeds(centerId)
  
  const [currentFeedIndex, setCurrentFeedIndex] = useState(0)
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [timeInFeed, setTimeInFeed] = useState(0)
  
  // Rotació de feeds
  useEffect(() => {
    if (!feeds || feeds.length === 0) return
    
    const interval = setInterval(() => {
      setTimeInFeed(prev => prev + 1)
      
      // Si hem superat el temps per feed, passar al següent
      if (timeInFeed >= durationPerFeed) {
        setCurrentFeedIndex((prev) => (prev + 1) % feeds.length)
        setCurrentItemIndex(0)
        setTimeInFeed(0)
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [feeds, timeInFeed, durationPerFeed])
  
  // Rotació d'ítems dins del feed actual
  useEffect(() => {
    if (!feeds || feeds.length === 0) return
    
    const currentFeed = feeds[currentFeedIndex]
    if (!currentFeed?.items || currentFeed.items.length === 0) return
    
    const interval = setInterval(() => {
      setCurrentItemIndex((prev) => (prev + 1) % currentFeed.items.length)
    }, durationPerItem * 1000)
    
    return () => clearInterval(interval)
  }, [feeds, currentFeedIndex, durationPerItem])
  
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Carregant notícies...</p>
      </div>
    )
  }
  
  if (!feeds || feeds.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">No hi ha RSS configurats</p>
      </div>
    )
  }
  
  const currentFeed = feeds[currentFeedIndex]
  
  if (!currentFeed?.items || currentFeed.items.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Sense notícies disponibles</p>
      </div>
    )
  }
  
  const currentItem = currentFeed.items[currentItemIndex]
  
  return (
    <div className="h-full flex flex-col bg-white p-4">
      {/* Header del feed */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
        {currentFeed.feed_image_url && (
          <img
            src={currentFeed.feed_image_url}
            alt={currentFeed.feed_title}
            className="w-6 h-6 object-contain"
          />
        )}
        <span className="text-sm font-medium text-gray-600">
          {currentFeed.feed_title || currentFeed.name}
        </span>
      </div>
      
      {/* Ítem actual */}
      <div className="flex-1 flex flex-col">
        {currentItem.image_url && (
          <img
            src={currentItem.image_url}
            alt={currentItem.title}
            className="w-full h-32 object-cover rounded-lg mb-3"
          />
        )}
        
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-3">
          {currentItem.title}
        </h3>
        
        {currentItem.description && (
          <p className="text-sm text-gray-600 line-clamp-4 mb-3">
            {currentItem.description}
          </p>
        )}
        
        {currentItem.pub_date && (
          <p className="text-xs text-gray-400 mt-auto">
            {format(new Date(currentItem.pub_date), "d 'de' MMMM, HH:mm", { locale: ca })}
          </p>
        )}
      </div>
      
      {/* Indicador de progrés */}
      <div className="flex gap-1 mt-3">
        {currentFeed.items.map((_, index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded ${
              index === currentItemIndex ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
```

---

## 7) Gestió d'Errors i Fallback

### 7.1 Retry amb Exponential Backoff

```typescript
// lib/rss/retry.ts
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError!
}

// Ús
const feed = await fetchWithRetry(
  () => parseRSSFeed(url),
  3,
  1000
)
```

### 7.2 Fallback Graceful

```typescript
// components/RSSDisplay.tsx amb gestió d'errors
export function RSSDisplay({ centerId }) {
  const { data: feeds, isError, error } = useRSSFeeds(centerId)
  
  if (isError) {
    // Intentar recuperar de caché local
    const cachedFeeds = getCachedFeeds(centerId)
    
    if (cachedFeeds) {
      return <RSSContent feeds={cachedFeeds} isStale={true} />
    }
    
    // Si no hi ha caché, mostrar missatge
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-100 p-4">
        <p className="text-gray-600 mb-2">
          Contingut no disponible temporalment
        </p>
        <p className="text-xs text-gray-400">
          Es reintentarà automàticament
        </p>
      </div>
    )
  }
  
  // ... resta del component
}
```

---

## 8) Configuració per Centre

### 8.1 Pàgina de Configuració RSS

```typescript
// app/rss/config/page.tsx
export default function RSSConfigPage() {
  const { data: settings } = useQuery({
    queryKey: ['rss-settings'],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('rss_center_settings')
        .select('*')
        .single()
      
      return data
    }
  })
  
  const updateSettings = useMutation({
    mutationFn: async (newSettings) => {
      const supabase = createClient()
      await supabase
        .from('rss_center_settings')
        .upsert(newSettings)
    }
  })
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Configuració RSS</h1>
      
      <form onSubmit={handleSubmit(data => updateSettings.mutate(data))}>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium mb-2">
              Durada per titular (segons)
            </label>
            <input
              type="number"
              {...register('duration_per_item_seconds')}
              min="5"
              max="60"
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Temps que es mostra cada notícia
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Durada per feed (segons)
            </label>
            <input
              type="number"
              {...register('duration_per_feed_seconds')}
              min="30"
              max="600"
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Temps que es mostra cada feed abans de rotar
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Interval d'actualització (minuts)
            </label>
            <input
              type="number"
              {...register('refresh_interval_minutes')}
              min="15"
              max="1440"
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Freqüència de refresc dels feeds
            </p>
          </div>
          
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Guardar configuració
          </button>
        </div>
      </form>
    </div>
  )
}
```

---

## 9) Testing

### 9.1 Test de Parser

```typescript
// __tests__/rss/parser.test.ts
describe('RSS Parser', () => {
  test('parseja feed RSS vàlid', async () => {
    const feed = await parseRSSFeed('https://feeds.bbci.co.uk/news/rss.xml')
    
    expect(feed.title).toBeDefined()
    expect(feed.items.length).toBeGreaterThan(0)
    expect(feed.items[0]).toHaveProperty('title')
    expect(feed.items[0]).toHaveProperty('link')
  })
  
  test('llença error per URL invàlida', async () => {
    await expect(parseRSSFeed('https://invalid-url.com/rss'))
      .rejects.toThrow()
  })
})
```

---

## 10) Checklist d'Implementació

**Backend:**
- [ ] Crear taules `rss_feeds`, `rss_items`, `rss_center_settings`, `rss_rotation_order`
- [ ] Implementar parser de RSS/Atom
- [ ] API route de validació `/api/rss/validate`
- [ ] Edge Function per fetch de feeds
- [ ] Configurar Cron Job (Supabase o Vercel)

**Frontend:**
- [ ] Component `RSSFeedForm` amb validació
- [ ] Component `RSSDisplay` amb rotació
- [ ] Hook `useRSSFeeds` amb caché
- [ ] Pàgina de configuració RSS
- [ ] Gestió d'errors amb fallback

**Testing:**
- [ ] Test de parser amb feeds reals
- [ ] Test de validació d'URLs
- [ ] Test de rotació de feeds/ítems
- [ ] Test de gestió d'errors

---

## 11) Referències

- [RSS Parser (npm)](https://www.npmjs.com/package/rss-parser)
- [RSS 2.0 Specification](https://www.rssboard.org/rss-specification)
- [Atom Specification](https://datatracker.ietf.org/doc/html/rfc4287)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [React Query](https://tanstack.com/query/latest)

---

**Temps estimat d'implementació:** 5-6 hores (incloent parser, caché, rotació i gestió d'errors)
