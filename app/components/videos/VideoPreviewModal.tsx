'use client';

import { X, CheckCircle, XCircle, User, Clock, Play } from 'lucide-react';
import { extractVimeoId } from '@/lib/vimeo/utils';
import { formatDistanceToNow } from 'date-fns';
import { ca } from 'date-fns/locale';

interface Video {
  id: string;
  title: string;
  description: string | null;
  type: 'content' | 'announcement';
  vimeo_url: string;
  vimeo_hash?: string | null;
  duration_seconds: number | null;
  created_at: string;
  centers?: {
    name: string;
    zones: {
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
    full_name: string | null;
  };
}

interface VideoPreviewModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (videoId: string) => void;
  onReject?: (videoId: string) => void;
  showModerationActions?: boolean;
}

export default function VideoPreviewModal({
  video,
  isOpen,
  onClose,
  onApprove,
  onReject,
  showModerationActions = false,
}: VideoPreviewModalProps) {
  if (!isOpen || !video) return null;

  const vimeoId = extractVimeoId(video.vimeo_url);
  const tags = video.video_tags?.map(vt => vt.tags) || [];
  const hashtags = video.video_hashtags?.map(vh => vh.hashtags) || [];

  const handleApprove = () => {
    if (onApprove) {
      onApprove(video.id);
      onClose();
    }
  };

  const handleReject = () => {
    if (onReject) {
      const confirmed = confirm('Segur que vols rebutjar aquest vídeo? S\'esborrarà permanentment.');
      if (confirmed) {
        onReject(video.id);
        onClose();
      }
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl pointer-events-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
            <div className="flex items-center gap-2">
              <Play className="w-6 h-6 text-[var(--color-secondary)]" />
              <h2 className="text-2xl font-bold text-[var(--color-dark)]">Previsualització de vídeo</h2>
            </div>
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
              src={`https://player.vimeo.com/video/${vimeoId}${video.vimeo_hash ? `?h=${video.vimeo_hash}&` : '?'}autoplay=0`}
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
            <h3 className="text-2xl font-semibold text-[var(--color-dark)]">{video.title}</h3>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              {video.uploaded_by && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{video.uploaded_by.full_name || 'Desconegut'}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true, locale: ca })}</span>
              </div>
              {video.duration_seconds && (
                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold">
                  ⏱️ {formatDuration(video.duration_seconds)}
                </span>
              )}
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                video.type === 'announcement'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-secondary)] text-white'
              }`}>
                {video.type === 'announcement' ? '🎬 Anunci' : '📹 Contingut'}
              </span>
            </div>

            {/* Center and Zone */}
            {video.centers && (
              <div className="text-sm text-gray-600">
                📍 {video.centers.name} · {video.centers.zones.name}
              </div>
            )}

            {/* Description */}
            {video.description && (
              <div>
                <h4 className="font-medium mb-2 text-[var(--color-dark)]">Descripció:</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{video.description}</p>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-[var(--color-dark)]">Etiquetes globals:</h4>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Hashtags */}
            {hashtags.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-[var(--color-dark)]">Hashtags:</h4>
                <div className="flex flex-wrap gap-2">
                  {hashtags.map(hashtag => (
                    <span
                      key={hashtag.id}
                      className="text-sm text-[var(--color-secondary)] font-medium"
                    >
                      {hashtag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Moderation Actions (només si showModerationActions és true) */}
            {showModerationActions && onApprove && onReject && (
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={handleApprove}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Aprovar vídeo
                </button>
                <button
                  onClick={handleReject}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Rebutjar vídeo
                </button>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Tancar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
