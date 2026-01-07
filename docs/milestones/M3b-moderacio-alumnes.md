# M3b: Moderació Alumnes

**Durada estimada:** 1 setmana  
**Dependències:** M3a completat (Contingut Base)  
**Risc:** 🟡 Mitjà (Supabase Realtime subscriptions)

---

## 📋 Objectiu

Permetre que Editor-alumne pugui pujar vídeos que queden pendents d'aprovació per Editor-profe, amb un sistema de notificacions en temps real i un dashboard de moderació.

---

## 🎯 Criteris d'Acceptació

- [ ] Editor-alumne pot pujar vídeos (queden `pending_approval`)
- [ ] Editor-profe rep notificació in-app quan hi ha nou vídeo pendent
- [ ] Editor-profe pot **previsualitzar** vídeos abans d'aprovar-los
- [ ] Modal de previsualització mostra reproductor Vimeo embed funcional
- [ ] Editor-profe pot aprovar vídeos des de `/moderacio`
- [ ] Editor-profe pot rebutjar vídeos (vídeo s'esborra)
- [ ] Editor-alumne rep notificació quan s'aprova el seu vídeo
- [ ] Badge de notificacions funciona amb Supabase Realtime
- [ ] Comptador de vídeos pendents visible al menú lateral
- [ ] Sistema de notificacions marca com llegides automàticament
- [ ] Notificacions antigues (>30 dies) es poden esborrar

---

## 🔄 Workflow de Moderació

```
┌─────────────────────────────────────────────────────────────┐
│  Editor-alumne puja vídeo                                    │
│  (Formulari igual que Editor-profe)                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Vídeo guardat amb:                                          │
│  - status = 'pending_approval'                               │
│  - is_shared_with_other_centers = false (forçat)             │
│  - created_by = auth.uid()                                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Trigger SQL: notify_pending_video()                         │
│  Crea notificació per tots els Editor-profe del centre       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Editor-profe accedeix /moderacio                            │
│  Veu llista de vídeos pendents amb:                          │
│  - Thumbnail                                                 │
│  - Títol, descripció                                         │
│  - Autor (nom de l'alumne)                                   │
│  - Data de pujada                                            │
│  - Tags i hashtags                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Editor-profe revisa i decideix                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ├──────────────┬──────────────────────┐
                        │              │                      │
                        ▼              ▼                      ▼
              ┌─────────────┐  ┌──────────┐        ┌─────────────┐
              │  APROVAR    │  │ REBUTJAR │        │  CANCEL·LAR │
              └──────┬──────┘  └────┬─────┘        └─────────────┘
                     │              │
                     ▼              ▼
        ┌────────────────┐  ┌────────────────┐
        │ status =       │  │ DELETE vídeo   │
        │ 'published'    │  └────────┬───────┘
        └────────┬───────┘           │
                 │                   │
                 ▼                   ▼
    ┌──────────────────────┐ ┌────────────────────────┐
    │ Trigger:             │ │ Trigger:               │
    │ notify_video_        │ │ notify_video_rejected()│
    │ approved()           │ │ (Opcional)             │
    └──────────┬───────────┘ └────────┬───────────────┘
               │                      │
               ▼                      ▼
    ┌──────────────────────┐ ┌────────────────────────┐
    │ Notificació alumne:  │ │ Notificació alumne:    │
    │ "Vídeo aprovat"      │ │ "Vídeo rebutjat"       │
    └──────────────────────┘ └────────────────────────┘
```

---

## 🗄️ Base de Dades

### Taula `notifications` (ja creada a M1)

Aquesta taula ja existeix, però cal confirmar que té tots els camps necessaris:

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'video_pending', 'video_approved', 'video_rejected'
  title TEXT NOT NULL,
  message TEXT,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX idx_notifications_user_unread (user_id, read, created_at)
);

-- RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Usuari només pot veure les seves notificacions
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Usuari pot marcar com llegides les seves notificacions
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);
```

### Triggers SQL

#### 1. `notify_pending_video()`

S'executa quan un Editor-alumne crea un vídeo amb `status = 'pending_approval'`.

```sql
CREATE OR REPLACE FUNCTION notify_pending_video()
RETURNS TRIGGER AS $$
DECLARE
  author_name TEXT;
  video_title TEXT;
  profe_record RECORD;
BEGIN
  -- Només notificar si el vídeo està pendent d'aprovació
  IF NEW.status != 'pending_approval' THEN
    RETURN NEW;
  END IF;

  -- Obtenir nom de l'autor
  SELECT full_name INTO author_name
  FROM users
  WHERE id = NEW.created_by;

  video_title := NEW.title;

  -- Crear notificació per cada Editor-profe del mateix centre
  FOR profe_record IN
    SELECT id
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
      created_at
    ) VALUES (
      profe_record.id,
      'video_pending',
      'Nou vídeo pendent d''aprovació',
      format('%s ha pujat el vídeo "%s"', author_name, video_title),
      NEW.id,
      now()
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_video_pending ON videos;
CREATE TRIGGER on_video_pending
  AFTER INSERT ON videos
  FOR EACH ROW
  EXECUTE FUNCTION notify_pending_video();
```

#### 2. `notify_video_approved()`

S'executa quan un Editor-profe aprova un vídeo (canvia `status` de `pending_approval` a `published`).

```sql
CREATE OR REPLACE FUNCTION notify_video_approved()
RETURNS TRIGGER AS $$
DECLARE
  video_title TEXT;
BEGIN
  -- Només notificar si passa de pending a published
  IF OLD.status = 'pending_approval' AND NEW.status = 'published' THEN
    
    video_title := NEW.title;
    
    -- Crear notificació per l'autor del vídeo
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      video_id,
      created_at
    ) VALUES (
      NEW.created_by,
      'video_approved',
      'Vídeo aprovat',
      format('El teu vídeo "%s" ha estat aprovat', video_title),
      NEW.id,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_video_status_change ON videos;
CREATE TRIGGER on_video_status_change
  AFTER UPDATE OF status ON videos
  FOR EACH ROW
  EXECUTE FUNCTION notify_video_approved();
```

#### 3. `notify_video_rejected()` (Opcional)

Si es vol notificar quan un vídeo és rebutjat (esborrat), cal fer-ho abans del DELETE:

```sql
CREATE OR REPLACE FUNCTION notify_video_rejected()
RETURNS TRIGGER AS $$
DECLARE
  video_title TEXT;
  author_id UUID;
BEGIN
  -- Només notificar si el vídeo estava pendent
  IF OLD.status = 'pending_approval' THEN
    
    video_title := OLD.title;
    author_id := OLD.created_by;
    
    -- Crear notificació per l'autor
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      video_id,
      created_at
    ) VALUES (
      author_id,
      'video_rejected',
      'Vídeo rebutjat',
      format('El teu vídeo "%s" no ha estat aprovat', video_title),
      NULL, -- video_id null perquè s'esborrarà
      now()
    );
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger BEFORE DELETE
DROP TRIGGER IF EXISTS on_video_rejected ON videos;
CREATE TRIGGER on_video_rejected
  BEFORE DELETE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION notify_video_rejected();
```

---

## 🔒 Permisos (RLS Updates)

### Política de vídeos per Editor-alumne

```sql
-- Editor-alumne pot crear vídeos (queden pending_approval)
CREATE POLICY "Editor-alumne can create videos"
  ON videos FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role = 'editor_alumne'
        AND center_id = videos.center_id
        AND is_active = true
    )
  );

-- Editor-alumne pot veure:
-- 1. Els seus vídeos pendents
-- 2. Tots els vídeos aprovats del centre
CREATE POLICY "Editor-alumne can view own pending and all published"
  ON videos FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role = 'editor_alumne'
        AND center_id = videos.center_id
        AND is_active = true
    )
    AND (
      (status = 'pending_approval' AND created_by = auth.uid())
      OR status = 'published'
    )
  );

-- Editor-alumne NO pot editar ni esborrar vídeos (ni propis ni d'altres)
-- No cal crear policies per UPDATE/DELETE
```

### Política de vídeos per Editor-profe (actualitzar)

```sql
-- Editor-profe pot veure TOTS els vídeos del centre (pending i published)
DROP POLICY IF EXISTS "Editor-profe can view all center videos" ON videos;
CREATE POLICY "Editor-profe can view all center videos"
  ON videos FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role = 'editor_profe'
        AND center_id = videos.center_id
        AND is_active = true
    )
  );

-- Editor-profe pot aprovar vídeos (UPDATE status)
CREATE POLICY "Editor-profe can approve videos"
  ON videos FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role = 'editor_profe'
        AND center_id = videos.center_id
        AND is_active = true
    )
  );

-- Editor-profe pot esborrar vídeos (rebutjar)
CREATE POLICY "Editor-profe can delete videos"
  ON videos FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role = 'editor_profe'
        AND center_id = videos.center_id
        AND is_active = true
    )
  );
```

---

## 🎨 Components

### 1. `ModerationDashboard.tsx`

**Ubicació:** `app/moderacio/page.tsx`

**Responsabilitats:**
- Obtenir llista de vídeos `pending_approval` del centre
- Mostrar targetes de vídeo amb informació completa
- Gestionar aprovació/rebuig
- Refetch després de cada acció

**API:**
```typescript
// GET /api/moderation/pending
// Retorna vídeos amb status = 'pending_approval' del centre de l'usuari

interface PendingVideo {
  id: string;
  title: string;
  description: string;
  vimeo_url: string;
  thumbnail_url: string;
  duration: number;
  type: 'content' | 'announcement';
  created_by: string;
  author_name: string; // Nom de l'alumne
  created_at: string;
  tags: Tag[];
  hashtags: Hashtag[];
}
```

**Exemple:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/utils/supabase/client';
import { PendingVideoCard } from '@/app/components/moderation/PendingVideoCard';
import { Button } from '@/app/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function ModerationPage() {
  const { profile } = useAuth();
  const [pendingVideos, setPendingVideos] = useState<PendingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewVideo, setPreviewVideo] = useState<PendingVideo | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchPendingVideos();
  }, []);

  const fetchPendingVideos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('videos')
      .select(`
        *,
        author:users!videos_created_by_fkey(full_name),
        video_tags(tag:tags(*)),
        video_hashtags(hashtag:hashtags(*))
      `)
      .eq('center_id', profile?.center_id)
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false });

    if (data) {
      const formatted = data.map(v => ({
        ...v,
        author_name: v.author?.full_name || 'Desconegut',
        tags: v.video_tags?.map(vt => vt.tag) || [],
        hashtags: v.video_hashtags?.map(vh => vh.hashtag) || []
      }));
      setPendingVideos(formatted);
    }
    setLoading(false);
  };

  const handleApprove = async (videoId: string) => {
    const { error } = await supabase
      .from('videos')
      .update({ status: 'published' })
      .eq('id', videoId);

    if (!error) {
      fetchPendingVideos(); // Refetch
    }
  };

  const handleReject = async (videoId: string) => {
    const confirmed = confirm('Segur que vols rebutjar aquest vídeo? S\'esborrarà permanentment.');
    if (!confirmed) return;

    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId);

    if (!error) {
      fetchPendingVideos(); // Refetch
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Moderació de Vídeos</h1>
      
      {pendingVideos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No hi ha vídeos pendents d'aprovació</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingVideos.map(video => (
            <PendingVideoCard
              key={video.id}
              video={video}
              onPreview={setPreviewVideo}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {/* Modal de previsualització */}
      <VideoPreviewModal
        video={previewVideo!}
        isOpen={!!previewVideo}
        onClose={() => setPreviewVideo(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
```

---

### 2. `PendingVideoCard.tsx`

**Ubicació:** `app/components/moderation/PendingVideoCard.tsx`

**Responsabilitats:**
- Mostrar thumbnail, metadades i autor
- Botons Aprovar/Rebutjar
- Confirmació abans de rebutjar

**Exemple:**
```typescript
'use client';

import { Card, CardContent, CardFooter, CardHeader } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ca } from 'date-fns/locale';

interface PendingVideoCardProps {
  video: PendingVideo;
  onPreview: (video: PendingVideo) => void;
  onApprove: (videoId: string) => void;
  onReject: (videoId: string) => void;
}

export function PendingVideoCard({ video, onPreview, onApprove, onReject }: PendingVideoCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="p-0">
        <div className="relative aspect-video">
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
          />
          <Badge className="absolute top-2 right-2 bg-yellow-500">
            <Clock className="w-3 h-3 mr-1" />
            Pendent
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{video.title}</h3>
        
        <div className="flex items-center text-sm text-gray-600 mb-2">
          <User className="w-4 h-4 mr-1" />
          <span>{video.author_name}</span>
          <span className="mx-2">•</span>
          <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true, locale: ca })}</span>
        </div>

        {video.description && (
          <p className="text-sm text-gray-700 mb-3 line-clamp-3">{video.description}</p>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          {video.tags.slice(0, 3).map(tag => (
            <Badge key={tag.id} variant="secondary">
              {tag.name}
            </Badge>
          ))}
          {video.hashtags.slice(0, 2).map(hashtag => (
            <Badge key={hashtag.id} variant="outline">
              {hashtag.name}
            </Badge>
          ))}
        </div>

        <Badge variant={video.type === 'announcement' ? 'default' : 'secondary'}>
          {video.type === 'announcement' ? 'Anunci' : 'Contingut'}
        </Badge>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex flex-col gap-2">
        {/* Botó de previsualització (nou) */}
        <Button
          onClick={() => onPreview(video)}
          variant="outline"
          className="w-full"
        >
          👁️ Previsualitzar vídeo
        </Button>
        
        {/* Botons d'acció */}
        <div className="flex gap-2 w-full">
          <Button
            onClick={() => onApprove(video.id)}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Aprovar
          </Button>
          <Button
            onClick={() => onReject(video.id)}
            variant="destructive"
            className="flex-1"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Rebutjar
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
```

---

### 3. `VideoPreviewModal.tsx`

**Ubicació:** `app/components/moderation/VideoPreviewModal.tsx`

**Responsabilitats:**
- Mostrar reproductor Vimeo embed en modal
- Mostrar metadades completes del vídeo
- Botons d'acció: Aprovar, Rebutjar, Tancar
- Responsive i accessible

**Exemple:**
```typescript
'use client';

import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { X, CheckCircle, XCircle, User, Clock } from 'lucide-react';
import { extractVimeoId } from '@/lib/vimeo/utils';
import { formatDistanceToNow } from 'date-fns';
import { ca } from 'date-fns/locale';

interface VideoPreviewModalProps {
  video: PendingVideo;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (videoId: string) => void;
  onReject: (videoId: string) => void;
}

export function VideoPreviewModal({
  video,
  isOpen,
  onClose,
  onApprove,
  onReject
}: VideoPreviewModalProps) {
  if (!isOpen) return null;

  const vimeoId = extractVimeoId(video.vimeo_url);

  const handleApprove = () => {
    onApprove(video.id);
    onClose();
  };

  const handleReject = () => {
    const confirmed = confirm('Segur que vols rebutjar aquest vídeo? S\'esborrarà permanentment.');
    if (confirmed) {
      onReject(video.id);
      onClose();
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
            <h2 className="text-2xl font-bold">Previsualització de vídeo</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Video Player */}
          <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0`}
              className="absolute top-0 left-0 w-full h-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={video.title}
            />
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Title */}
            <h3 className="text-xl font-semibold">{video.title}</h3>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{video.author_name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true, locale: ca })}</span>
              </div>
              <Badge variant={video.type === 'announcement' ? 'default' : 'secondary'}>
                {video.type === 'announcement' ? 'Anunci' : 'Contingut'}
              </Badge>
            </div>

            {/* Description */}
            {video.description && (
              <div>
                <h4 className="font-medium mb-2">Descripció:</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{video.description}</p>
              </div>
            )}

            {/* Tags */}
            {video.tags.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Etiquetes globals:</h4>
                <div className="flex flex-wrap gap-2">
                  {video.tags.map(tag => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Hashtags */}
            {video.hashtags.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Hashtags:</h4>
                <div className="flex flex-wrap gap-2">
                  {video.hashtags.map(hashtag => (
                    <span key={hashtag.id} className="text-sm text-blue-600 font-medium">
                      {hashtag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleApprove}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Aprovar vídeo
              </Button>
              <Button
                onClick={handleReject}
                variant="destructive"
                className="flex-1"
                size="lg"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Rebutjar vídeo
              </Button>
            </div>

            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full"
            >
              Tancar sense accions
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
```

---

### 4. `NotificationBadge.tsx`

**Ubicació:** `app/components/layout/NotificationBadge.tsx`

**Responsabilitats:**
- Mostrar comptador de notificacions no llegides
- Supabase Realtime per actualitzacions
- Clicar obre dropdown de notificacions

**Exemple:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationDropdown } from './NotificationDropdown';

export function NotificationBadge() {
  const { unreadCount, notifications, markAsRead, markAllAsRead } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {showDropdown && (
        <NotificationDropdown
          notifications={notifications}
          onClose={() => setShowDropdown(false)}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
        />
      )}
    </div>
  );
}
```

---

### 4. `NotificationDropdown.tsx`

**Ubicació:** `app/components/layout/NotificationDropdown.tsx`

**Responsabilitats:**
- Llista de notificacions (últimes 10)
- Clicar notificació → marca com llegida + navega al vídeo
- Botó "Marcar totes com llegides"

**Exemple:**
```typescript
'use client';

import { useRef, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { CheckCheck, Video } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ca } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

interface NotificationDropdownProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export function NotificationDropdown({
  notifications,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead
}: NotificationDropdownProps) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  // Tancar quan es clica fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    
    if (notification.type === 'video_pending') {
      router.push('/moderacio');
    } else if (notification.video_id) {
      router.push(`/contingut?video=${notification.video_id}`);
    }
    
    onClose();
  };

  return (
    <Card
      ref={ref}
      className="absolute right-0 top-12 w-96 max-h-[500px] overflow-y-auto shadow-xl z-50"
    >
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold">Notificacions</h3>
        {notifications.some(n => !n.read) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
          >
            <CheckCheck className="w-4 h-4 mr-1" />
            Marcar totes
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No tens notificacions</p>
        </div>
      ) : (
        <div className="divide-y">
          {notifications.map(notification => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                !notification.read ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${
                  notification.type === 'video_pending'
                    ? 'bg-yellow-100'
                    : notification.type === 'video_approved'
                    ? 'bg-green-100'
                    : 'bg-red-100'
                }`}>
                  <Video className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{notification.title}</p>
                  {notification.message && (
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                      locale: ca
                    })}
                  </p>
                </div>

                {!notification.read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
```

---

### 5. Hook `useNotifications.ts`

**Ubicació:** `hooks/useNotifications.ts`

**Responsabilitats:**
- Obtenir notificacions de l'usuari
- Supabase Realtime subscription
- Funcions per marcar com llegides

**Exemple:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './useAuth';

interface Notification {
  id: string;
  user_id: string;
  type: 'video_pending' | 'video_approved' | 'video_rejected';
  title: string;
  message: string | null;
  video_id: string | null;
  read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Supabase Realtime subscription
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new as Notification, ...prev]);
            setUnreadCount(prev => prev + 1);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev =>
              prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
            );
            if ((payload.new as Notification).read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user?.id)
      .eq('read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  };
}
```

---

## 📱 Integració al Sidebar

### Badge de vídeos pendents

Actualitzar `app/components/layout/AppSidebar.tsx` per mostrar comptador de vídeos pendents al menú lateral.

```typescript
const [pendingCount, setPendingCount] = useState(0);

useEffect(() => {
  if (profile?.role !== 'editor_profe') return;

  const fetchPendingCount = async () => {
    const { count } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('center_id', profile.center_id)
      .eq('status', 'pending_approval');

    setPendingCount(count || 0);
  };

  fetchPendingCount();

  // Realtime
  const channel = supabase
    .channel('pending_videos')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'videos',
        filter: `center_id=eq.${profile.center_id}`
      },
      () => fetchPendingCount()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [profile]);

// Al menú:
{
  title: 'Moderació',
  url: '/moderacio',
  icon: Shield,
  roles: ['editor_profe'],
  badge: pendingCount > 0 ? pendingCount : undefined
}
```

---

## 🧪 Testing

### Tests unitaris

```typescript
// __tests__/hooks/useNotifications.test.ts
describe('useNotifications', () => {
  it('fetches notifications on mount', async () => {
    // Mock Supabase
    // Assert notifications loaded
  });

  it('updates unread count when marking as read', async () => {
    // Mock markAsRead
    // Assert unreadCount decreases
  });

  it('subscribes to realtime updates', async () => {
    // Mock realtime channel
    // Trigger INSERT event
    // Assert new notification appears
  });
});
```

### Tests d'integració

```typescript
// __tests__/pages/moderation.test.tsx
describe('/moderacio', () => {
  it('shows pending videos', async () => {
    // Mock API
    // Render page
    // Assert videos displayed
  });

  it('approves video correctly', async () => {
    // Mock approve action
    // Click approve button
    // Assert video disappears from list
  });

  it('rejects video with confirmation', async () => {
    // Mock reject action
    // Click reject button
    // Assert confirmation dialog
    // Confirm
    // Assert video deleted
  });
});
```

### Tests E2E (Playwright)

```typescript
// e2e/moderation.spec.ts
test('editor-alumne uploads video and editor-profe approves it', async ({ page }) => {
  // Login as editor-alumne
  await page.goto('/contingut');
  await page.click('button:has-text("Pujar Vídeo")');
  // Fill form
  await page.click('button:has-text("Guardar")');
  
  // Logout and login as editor-profe
  await page.goto('/moderacio');
  await expect(page.locator('.pending-video-card')).toBeVisible();
  
  // Approve video
  await page.click('button:has-text("Aprovar")');
  await expect(page.locator('.pending-video-card')).toHaveCount(0);
  
  // Login back as editor-alumne
  // Check notification
  await expect(page.locator('.notification-badge')).toHaveText('1');
});
```

---

## 📈 Mètriques de Rendiment

### KPIs

- **Temps de resposta de notificacions:** <500ms des de l'acció fins a la notificació
- **Precisió del comptador:** 100% sincronitzat amb BD
- **Uptime de Realtime:** >99%
- **Latència d'aprovació:** <2s des de clicar "Aprovar" fins refetch

### Monitoring

Afegir logs a cada acció crítica:

```typescript
// Aprovació
console.log(`[MODERATION] Video ${videoId} approved by ${userId} at ${new Date()}`);

// Notificació creada
console.log(`[NOTIFICATION] Created notification ${notificationId} for user ${userId}`);
```

---

## 🚀 Deployment

### Checklist de desplegament

1. **Base de dades:**
   - [ ] Verificar taula `notifications` existeix
   - [ ] Executar triggers SQL
   - [ ] Verificar RLS policies actualitzades

2. **Frontend:**
   - [ ] Components nous creats
   - [ ] Hook `useNotifications` funcional
   - [ ] Sidebar actualitzat amb badge
   - [ ] AppHeader amb NotificationBadge

3. **Testing:**
   - [ ] Tests unitaris passen
   - [ ] Tests E2E validen workflow complet
   - [ ] Test manual amb usuaris reals

4. **Realtime:**
   - [ ] Supabase Realtime activat al projecte
   - [ ] Channel subscriptions funcionant
   - [ ] Fallback a polling si Realtime falla

---

## ⚠️ Riscos i Mitigacions

| Risc | Probabilitat | Impacte | Mitigació |
|------|--------------|---------|-----------|
| **Supabase Realtime inestable** | 🟡 Mitjana | 🔴 Alt | Afegir polling fallback cada 10s si Realtime falla |
| **Notificacions duplicades** | 🟢 Baixa | 🟡 Mitjà | Deduplicació per `id` al client |
| **Overload de notificacions** | 🟢 Baixa | 🟡 Mitjà | Limitar a 50 notificacions, esborrar antigues >30 dies |
| **Trigger errors** | 🟡 Mitjana | 🔴 Alt | Afegir `EXCEPTION WHEN OTHERS` a triggers + logs |

---

## 📚 Documentació Addicional

### Referències

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/plpgsql-trigger.html)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)

### Exemples de notificacions

**Tipus `video_pending`:**
```json
{
  "title": "Nou vídeo pendent d'aprovació",
  "message": "Joan Puig ha pujat el vídeo \"Experiment de química\"",
  "type": "video_pending",
  "video_id": "uuid-123"
}
```

**Tipus `video_approved`:**
```json
{
  "title": "Vídeo aprovat",
  "message": "El teu vídeo \"Experiment de química\" ha estat aprovat",
  "type": "video_approved",
  "video_id": "uuid-123"
}
```

**Tipus `video_rejected`:**
```json
{
  "title": "Vídeo rebutjat",
  "message": "El teu vídeo \"Experiment de química\" no ha estat aprovat",
  "type": "video_rejected",
  "video_id": null
}
```

---

## ✅ Definition of Done

- [ ] Editor-alumne pot pujar vídeos que queden `pending_approval`
- [ ] Editor-profe rep notificació in-app quan hi ha nou vídeo pendent
- [ ] Pàgina `/moderacio` mostra tots els vídeos pendents del centre
- [ ] Botó "Previsualitzar" funciona a cada targeta de vídeo pendent
- [ ] Modal de previsualització mostra reproductor Vimeo funcional
- [ ] Reproductor Vimeo embed funciona amb vídeos públics i ocults (unlisted)
- [ ] Editor-profe pot aprovar vídeos des del modal o des de la targeta
- [ ] Editor-profe pot rebutjar vídeos (DELETE amb confirmació)
- [ ] Editor-alumne rep notificació quan s'aprova el seu vídeo
- [ ] NotificationBadge mostra comptador en temps real
- [ ] Sidebar mostra badge amb número de vídeos pendents
- [ ] Supabase Realtime funciona correctament
- [ ] RLS policies permeten accés correcte segons rol
- [ ] Tests unitaris i E2E passen al 100%
- [ ] Documentació completa i actualitzada
- [ ] Zero errors crítics en consola
- [ ] Performance: <500ms per notificació
- [ ] Modal de previsualització és responsive i accessible

---

**Data de creació:** 7 gener 2026  
**Versió:** 1.0  
**Autor:** GitHub Copilot  
**Estat:** ✅ Documentat
