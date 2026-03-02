'use client';

import { useState, useEffect } from 'react';
import { Video, Clock, Megaphone, Globe, Play, Pencil, Trash2, X, MessageSquareWarning, Wrench } from 'lucide-react';
import { extractVimeoId } from '@/lib/vimeo/utils';

interface Video {
  id: string;
  title: string;
  description: string | null;
  type: 'content' | 'announcement';
  status: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  vimeo_url: string;
  vimeo_id?: string | null;
  vimeo_hash?: string | null;
  is_shared_with_other_centers: boolean;
  created_at: string;
  rejection_comment?: string | null;
  uploaded_by_user_id?: string | null;
  centers: {
    id: string;
    name: string;
    zones: {
      id: string;
      name: string;
    };
  };
  video_tags?: Array<{
    tags: {
      id: string;
      name: string;
    };
  }>;
  video_hashtags?: Array<{
    hashtags: {
      id: string;
      name: string;
    };
  }>;
  uploaded_by?: {
    id: string;
    full_name: string | null;
    email: string;
  };
}

interface VideoCardProps {
  video: Video;
  onEdit?: (video: Video) => void;
  onDelete?: (video: Video) => void;
  onPreview?: (video: Video) => void;
  onApprove?: (video: Video) => void;
  onRequestRevision?: (video: Video) => void;
  showActions?: boolean;
  userCenterId?: string | null;
  userRole?: string;
  userId?: string;
}

export default function VideoCard({
  video,
  onEdit,
  onDelete,
  onPreview,
  onApprove,
  onRequestRevision,
  showActions = true,
  userCenterId,
  userRole,
  userId,
}: VideoCardProps) {
  const [thumbnail, setThumbnail] = useState(video.thumbnail_url);
  const tags = video.video_tags?.map(vt => vt.tags).filter(Boolean) || [];
  const hashtags = video.video_hashtags?.map(vh => vh.hashtags).filter(Boolean) || [];

  const isOwnCenterVideo = userCenterId && video.centers?.id === userCenterId;
  const isOwnVideo = userId && video.uploaded_by_user_id === userId;
  const isNeedsRevision = video.status === 'needs_revision';
  const isPending = video.status === 'pending_approval';

  // Intentar obtenir thumbnail de Vimeo si no el té
  useEffect(() => {
    if (!thumbnail && video.vimeo_url) {
      const videoId = extractVimeoId(video.vimeo_url);
      if (videoId) {
        fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`)
          .then(res => res.json())
          .then(data => {
            if (data.thumbnail_url) {
              setThumbnail(data.thumbnail_url);
            }
          })
          .catch(() => {});
      }
    }
  }, [thumbnail, video.vimeo_url]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'fa 1 dia';
    if (diffDays < 7) return `fa ${diffDays} dies`;
    if (diffDays < 30) return `fa ${Math.floor(diffDays / 7)} setmanes`;
    return date.toLocaleDateString('ca-ES');
  };

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
      isNeedsRevision
        ? 'border-red-300 hover:border-red-400'
        : 'border-[var(--color-border)] hover:border-[var(--color-secondary)]'
    }`}>
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-[var(--color-light-bg)]">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-10 h-10 text-[var(--color-gray)]" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 right-2 flex gap-1 flex-wrap justify-end">
          {isNeedsRevision && (
            <span className="px-2 py-1 rounded-md text-xs font-semibold bg-red-500 text-white inline-flex items-center gap-1">
              <MessageSquareWarning className="w-3 h-3" /> Necessita revisió
            </span>
          )}
          {isPending && (
            <span className="px-2 py-1 rounded-md text-xs font-semibold bg-yellow-500 text-white inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> Pendent
            </span>
          )}
          <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
            video.type === 'announcement'
              ? 'bg-white/95 text-[var(--color-accent)]'
              : 'bg-white/95 text-[var(--color-secondary)]'
          }`}>
            {video.type === 'announcement' ? <><Megaphone className="w-3 h-3 inline" /> Anunci</> : <><Video className="w-3 h-3 inline" /> Contingut</>}
          </span>
          {video.is_shared_with_other_centers && (
            <span className="px-2 py-1 rounded-md text-xs font-semibold bg-[var(--color-secondary)] text-white inline-flex items-center gap-1">
              <Globe className="w-3 h-3" /> Compartit
            </span>
          )}
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-1 right-1 z-20">
          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-black text-white">
            {formatDuration(video.duration_seconds)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-[var(--color-dark)] mb-1 line-clamp-2 font-[family-name:var(--font-montserrat)]">
          {video.title}
        </h3>

        {/* Center and Zone */}
        <p className="text-sm text-[var(--color-gray)] mb-2 font-[family-name:var(--font-inter)]">
          {video.centers?.name || 'Centre desconegut'} · {video.centers?.zones?.name || 'Zona desconeguda'}
        </p>

        {/* Comentari del professor (visible per alumne en needs_revision) */}
        {isNeedsRevision && video.rejection_comment && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
              <MessageSquareWarning className="w-3 h-3" /> Comentari del professor:
            </p>
            <p className="text-xs text-red-800 leading-relaxed">{video.rejection_comment}</p>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map(tag => (
              <span
                key={tag.id}
                className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {hashtags.map(hashtag => (
              <span
                key={hashtag.id}
                className="text-xs text-[var(--color-secondary)] font-medium"
              >
                #{hashtag.name}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 flex-wrap">
            {/* Botó Aprovar - Només per editor_profe en vídeos pendents del propi centre */}
            {onApprove && isPending && isOwnCenterVideo && (
              <button
                onClick={() => onApprove(video)}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                title="Aprovar vídeo"
              >
                ✓ Aprovar
              </button>
            )}

            {/* Botó Demanar revisió - Només per editor_profe en vídeos pendents del propi centre */}
            {onRequestRevision && isPending && isOwnCenterVideo && (
              <button
                onClick={() => onRequestRevision(video)}
                className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                title="Demanar revisió amb comentari"
              >
                <MessageSquareWarning className="w-4 h-4" />
              </button>
            )}

            {/* Botó Veure Vídeo */}
            {onPreview && (
              <button
                onClick={() => onPreview(video)}
                className={`${(onApprove && isPending && isOwnCenterVideo) ? '' : 'flex-1'} px-3 py-2 bg-[var(--color-secondary)] hover:bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1`}
              >
                <Play className="w-4 h-4" /> Veure
              </button>
            )}

            {/* Botó Corregir - Per alumne en vídeos propis en needs_revision */}
            {onEdit && isNeedsRevision && isOwnVideo && userRole === 'editor_alumne' && (
              <button
                onClick={() => onEdit(video)}
                className="flex-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                title="Corregir el vídeo"
              >
                <Wrench className="w-4 h-4" /> Corregir
              </button>
            )}

            {/* Botó Editar - Per editor_profe/admin en vídeos del propi centre (no pending) */}
            {onEdit && isOwnCenterVideo && userRole !== 'editor_alumne' && !isPending && !isNeedsRevision && (
              <button
                onClick={() => onEdit(video)}
                className="px-3 py-2 bg-[var(--color-light-bg)] hover:bg-[var(--color-secondary)] hover:text-white text-[var(--color-dark)] rounded-lg text-sm font-medium transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}

            {/* Botó Eliminar - Només per profe/admin en vídeos del propi centre */}
            {onDelete && isOwnCenterVideo && userRole !== 'editor_alumne' && (
              <button
                onClick={() => onDelete(video)}
                className="px-3 py-2 bg-[var(--color-light-bg)] hover:bg-red-500 hover:text-white text-[var(--color-dark)] rounded-lg text-sm font-medium transition-colors"
                title={isPending ? 'Rebutjar vídeo' : 'Eliminar vídeo'}
              >
                {isPending ? <X className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export type { Video, VideoCardProps };
