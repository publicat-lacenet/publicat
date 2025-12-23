# Sistema de Moderació i Notificacions — Publicat

## 1) Visió General

El sistema de moderació permet que els **Editor-alumne** puguin pujar vídeos que queden **pendents d'aprovació** fins que un **Editor-profe** els revisi i aprovi o rebutgi.

Característiques clau:
- ✅ **Notificacions en temps real** per contingut pendent
- ✅ **Dashboard de moderació** per editors-profe
- ✅ **Històric d'aprovacions** per auditoria
- ✅ **Notificacions per email** (opcionals)
- ✅ **Indicadors visuals** de contingut pendent

---

## 2) Estats del Vídeo

### 2.1 Workflow de Moderació

```
[Editor-alumne puja vídeo]
        ↓
  pending_approval
        ↓
   [Editor-profe revisa]
        ↓
    ┌───────┴────────┐
    ↓                ↓
published        rejected
    ↓                ↓
[Visible]      [Esborrat]
```

### 2.2 Transicions d'Estat

| Des de | Cap a | Qui | Efecte |
|--------|-------|-----|--------|
| `pending_approval` | `published` | Editor-profe | Vídeo visible a tothom |
| `pending_approval` | rejected | Editor-profe | Vídeo esborrat (hard delete) |
| `published` | `pending_approval` | - | ❌ No permès |

**Nota:** Un cop publicat, un vídeo NO pot tornar a estat pendent. Si cal retirar-lo, es pot desactivar (`is_active=false`) o esborrar.

---

## 3) Sistema de Notificacions

### 3.1 Taula de Notificacions

```sql
-- Taula per notificacions in-app
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'video_pending' | 'video_approved' | 'video_rejected'
  title text NOT NULL,
  message text NOT NULL,
  
  -- Metadades relacionades
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL, -- Qui va generar la notificació
  
  -- Estat
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Índexs
  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_is_read (is_read),
  INDEX idx_notifications_created_at (created_at)
);

-- RLS: Usuaris només veuen les seves notificacions
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());
```

### 3.2 Trigger: Notificar Editors-profe quan hi ha Contingut Pendent

```sql
-- Funció per crear notificacions automàtiques
CREATE OR REPLACE FUNCTION notify_pending_video()
RETURNS TRIGGER AS $$
DECLARE
  editor_profe_record RECORD;
BEGIN
  -- Si és un vídeo nou en estat pending_approval
  IF NEW.status = 'pending_approval' AND (TG_OP = 'INSERT' OR OLD.status != 'pending_approval') THEN
    
    -- Notificar TOTS els editors-profe del centre
    FOR editor_profe_record IN 
      SELECT id, email 
      FROM users 
      WHERE center_id = NEW.center_id 
        AND role = 'editor_profe' 
        AND is_active = true
    LOOP
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        video_id,
        actor_user_id
      ) VALUES (
        editor_profe_record.id,
        'video_pending',
        'Nou vídeo pendent d''aprovació',
        'Hi ha un nou vídeo penjat per ' || (SELECT full_name FROM users WHERE id = NEW.uploaded_by_user_id) || ' que requereix la teva revisió.',
        NEW.id,
        NEW.uploaded_by_user_id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_video_pending
AFTER INSERT OR UPDATE OF status ON videos
FOR EACH ROW
EXECUTE FUNCTION notify_pending_video();
```

### 3.3 Trigger: Notificar Alumne quan el seu Vídeo és Aprovat/Rebutjat

```sql
-- Funció per notificar l'alumne sobre l'estat del seu vídeo
CREATE OR REPLACE FUNCTION notify_video_decision()
RETURNS TRIGGER AS $$
BEGIN
  -- Si passa de pending a published
  IF OLD.status = 'pending_approval' AND NEW.status = 'published' THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      video_id,
      actor_user_id
    ) VALUES (
      NEW.uploaded_by_user_id,
      'video_approved',
      'El teu vídeo ha estat aprovat! 🎉',
      'El vídeo "' || NEW.title || '" ja és visible a la plataforma.',
      NEW.id,
      NEW.approved_by_user_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_video_decision
AFTER UPDATE OF status ON videos
FOR EACH ROW
EXECUTE FUNCTION notify_video_decision();
```

**Nota:** Per vídeos rebutjats (esborrats), la notificació es pot enviar abans d'esborrar o via email directe.

---

## 4) API de Notificacions

### 4.1 Obtenir Notificacions de l'Usuari

```typescript
// app/api/notifications/route.ts
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unread') === 'true'
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  let query = supabase
    .from('notifications')
    .select(`
      *,
      video:videos(id, title, thumbnail_url),
      actor:actor_user_id(full_name, email)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (unreadOnly) {
    query = query.eq('is_read', false)
  }
  
  const { data, error } = await query
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}
```

### 4.2 Marcar Notificació com a Llegida

```typescript
// app/api/notifications/[id]/read/route.ts
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', params.id)
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ success: true })
}
```

### 4.3 Marcar Totes com a Llegides

```typescript
// app/api/notifications/read-all/route.ts
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user?.id)
    .eq('is_read', false)
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ success: true })
}
```

---

## 5) Components de Frontend

### 5.1 Hook per Notificacions

```typescript
// hooks/useNotifications.ts
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  video_id?: string
  is_read: boolean
  created_at: string
  video?: {
    id: string
    title: string
    thumbnail_url: string
  }
  actor?: {
    full_name: string
  }
}

export function useNotifications() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  // Fetch notificacions
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications')
      return res.json()
    },
    refetchInterval: 30000 // Refrescar cada 30 segons
  })
  
  // Subscripció en temps real
  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, queryClient])
  
  // Marcar com a llegida
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })
  
  // Marcar totes com a llegides
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await fetch('/api/notifications/read-all', { method: 'POST' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })
  
  const unreadCount = notifications.filter((n: Notification) => !n.is_read).length
  
  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate
  }
}
```

### 5.2 Badge de Notificacions a la Barra Superior

```typescript
// components/NotificationBadge.tsx
import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'

export function NotificationBadge() {
  const { unreadCount } = useNotifications()
  
  return (
    <button className="relative p-2 hover:bg-gray-100 rounded-full">
      <Bell className="w-6 h-6" />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}
```

### 5.3 Dropdown de Notificacions

```typescript
// components/NotificationDropdown.tsx
'use client'

import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { ca } from 'date-fns/locale'

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border z-50">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Notificacions</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-sm text-blue-600 hover:underline"
              >
                Marcar totes com a llegides
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No tens notificacions
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {notification.video?.thumbnail_url && (
                      <img
                        src={notification.video.thumbnail_url}
                        alt=""
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ca
                        })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 6) Dashboard de Moderació

### 6.1 Pàgina de Vídeos Pendents

```typescript
// app/moderacio/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export default function ModeracioPage() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  // Obtenir vídeos pendents
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['pending-videos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('videos')
        .select(`
          *,
          uploaded_by:uploaded_by_user_id(full_name, email)
        `)
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false })
      
      return data || []
    }
  })
  
  // Aprovar vídeo
  const approve = useMutation({
    mutationFn: async (videoId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('videos')
        .update({
          status: 'published',
          approved_by_user_id: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', videoId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-videos'] })
    }
  })
  
  // Rebutjar vídeo
  const reject = useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-videos'] })
    }
  })
  
  if (isLoading) return <div>Carregant...</div>
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        Vídeos pendents d'aprovació
      </h1>
      
      {videos.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <p className="text-gray-600">
            No hi ha cap vídeo pendent de revisió
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div key={video.id} className="bg-white rounded-lg shadow border overflow-hidden">
              <div className="aspect-video bg-gray-200">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    Sense miniatura
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">{video.title}</h3>
                {video.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {video.description}
                  </p>
                )}
                
                <div className="text-xs text-gray-500 mb-4">
                  Penjat per: <strong>{video.uploaded_by?.full_name}</strong>
                  <br />
                  {formatDistanceToNow(new Date(video.created_at), {
                    addSuffix: true,
                    locale: ca
                  })}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => approve.mutate(video.id)}
                    disabled={approve.isPending}
                    className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Segur que vols rebutjar aquest vídeo? S\'esborrarà permanentment.')) {
                        reject.mutate(video.id)
                      }
                    }}
                    disabled={reject.isPending}
                    className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Rebutjar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### 6.2 Badge al Menú Lateral

```typescript
// components/Sidebar.tsx
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export function Sidebar() {
  const supabase = createClient()
  
  // Comptar vídeos pendents
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pending-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval')
      
      return count || 0
    },
    refetchInterval: 30000 // Refrescar cada 30 segons
  })
  
  return (
    <nav className="flex flex-col gap-2 p-4">
      {/* Altres elements del menú */}
      
      <a
        href="/moderacio"
        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 relative"
      >
        <CheckCircle className="w-6 h-6" />
        <span>Moderació</span>
        {pendingCount > 0 && (
          <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1">
            {pendingCount}
          </span>
        )}
      </a>
    </nav>
  )
}
```

---

## 7) Notificacions per Email (Opcional)

### 7.1 Configuració de Resend

```typescript
// lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPendingVideoEmail(
  to: string,
  videoTitle: string,
  uploaderName: string
) {
  await resend.emails.send({
    from: 'Publicat <notificacions@publicat.cat>',
    to,
    subject: 'Nou vídeo pendent d\'aprovació',
    html: `
      <h2>Nou vídeo pendent de revisió</h2>
      <p>
        <strong>${uploaderName}</strong> ha penjat un nou vídeo que requereix la teva aprovació:
      </p>
      <p><strong>"${videoTitle}"</strong></p>
      <p>
        <a href="https://app.publicat.cat/moderacio">
          Revisar ara
        </a>
      </p>
    `
  })
}
```

### 7.2 Integració amb Trigger

```sql
-- Modificar trigger per enviar també email
CREATE OR REPLACE FUNCTION notify_pending_video()
RETURNS TRIGGER AS $$
DECLARE
  editor_profe_record RECORD;
BEGIN
  IF NEW.status = 'pending_approval' AND (TG_OP = 'INSERT' OR OLD.status != 'pending_approval') THEN
    
    FOR editor_profe_record IN 
      SELECT id, email 
      FROM users 
      WHERE center_id = NEW.center_id 
        AND role = 'editor_profe' 
        AND is_active = true
    LOOP
      -- Notificació in-app
      INSERT INTO notifications (...) VALUES (...);
      
      -- Email (via Edge Function)
      PERFORM net.http_post(
        url := current_setting('app.email_webhook_url'),
        body := json_build_object(
          'to', editor_profe_record.email,
          'video_title', NEW.title,
          'uploader_name', (SELECT full_name FROM users WHERE id = NEW.uploaded_by_user_id)
        )::text
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 8) Històric d'Aprovacions (Auditoria)

### 8.1 Consulta d'Històric

```typescript
// app/admin/auditoria/page.tsx
export default function AuditoriaPage() {
  const { data: history } = useQuery({
    queryKey: ['approval-history'],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          status,
          created_at,
          approved_at,
          uploaded_by:uploaded_by_user_id(full_name),
          approved_by:approved_by_user_id(full_name)
        `)
        .eq('status', 'published')
        .not('approved_by_user_id', 'is', null)
        .order('approved_at', { ascending: false })
        .limit(100)
      
      return data
    }
  })
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Històric d'aprovacions</h1>
      
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Vídeo</th>
            <th className="text-left p-2">Penjat per</th>
            <th className="text-left p-2">Aprovat per</th>
            <th className="text-left p-2">Data aprovació</th>
          </tr>
        </thead>
        <tbody>
          {history?.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="p-2">{item.title}</td>
              <td className="p-2">{item.uploaded_by?.full_name}</td>
              <td className="p-2">{item.approved_by?.full_name}</td>
              <td className="p-2">
                {format(new Date(item.approved_at), 'dd/MM/yyyy HH:mm')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

## 9) Testing

### 9.1 Test de Notificacions

```typescript
// __tests__/notifications.test.ts
describe('Notification System', () => {
  test('crea notificació quan hi ha vídeo pendent', async () => {
    // Crear vídeo pendent
    const { data: video } = await supabase
      .from('videos')
      .insert({
        title: 'Test Video',
        status: 'pending_approval',
        center_id: 'test-center',
        uploaded_by_user_id: 'student-id'
      })
      .select()
      .single()
    
    // Esperar que es creï la notificació
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Verificar notificació
    const { data: notifications } = await supabase
      .from('notifications')
      .select()
      .eq('video_id', video.id)
      .eq('type', 'video_pending')
    
    expect(notifications).toHaveLength(1)
  })
})
```

---

## 10) Checklist d'Implementació

**Backend:**
- [ ] Crear taula `notifications`
- [ ] Implementar triggers per notificacions automàtiques
- [ ] API routes per gestionar notificacions
- [ ] RLS policies per notificacions

**Frontend:**
- [ ] Hook `useNotifications` amb Realtime
- [ ] Component `NotificationBadge` a barra superior
- [ ] Dropdown de notificacions
- [ ] Pàgina de moderació (`/moderacio`)
- [ ] Badge de contingut pendent al menú
- [ ] Històric d'aprovacions (opcional)

**Opcional:**
- [ ] Integració amb Resend per emails
- [ ] Edge Function per enviar emails
- [ ] Dashboard d'auditoria

**Testing:**
- [ ] Test de creació de notificacions
- [ ] Test de triggers SQL
- [ ] Test de subscripcions Realtime
- [ ] Test E2E del flux complet de moderació

---

## 11) Referències

- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [React Query](https://tanstack.com/query/latest)
- [Resend Email API](https://resend.com/docs)

---

**Temps estimat d'implementació:** 4-5 hores (incloent notificacions in-app + dashboard de moderació)
