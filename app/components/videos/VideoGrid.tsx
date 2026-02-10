import { Video as VideoIcon } from 'lucide-react';
import VideoCard, { Video } from './VideoCard';

interface VideoGridProps {
  videos: Video[];
  loading?: boolean;
  onEdit?: (video: Video) => void;
  onDelete?: (video: Video) => void;
  onPreview?: (video: Video) => void;
  onApprove?: (video: Video) => void;
  showActions?: boolean;
  userCenterId?: string | null;
}

export default function VideoGrid({
  videos,
  loading = false,
  onEdit,
  onDelete,
  onPreview,
  onApprove,
  showActions = true,
  userCenterId,
}: VideoGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden animate-pulse">
            <div className="w-full aspect-video bg-gray-200" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <VideoIcon className="w-16 h-16 text-[var(--color-gray)] mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-[var(--color-dark)] mb-2 font-[family-name:var(--font-montserrat)]">
          No s'han trobat vídeos
        </h3>
        <p className="text-[var(--color-gray)] font-[family-name:var(--font-inter)]">
          Prova de canviar els filtres o puja el primer vídeo
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {videos.map(video => (
        <VideoCard
          key={video.id}
          video={video}
          onEdit={onEdit}
          onDelete={onDelete}
          onPreview={onPreview}
          onApprove={onApprove}
          showActions={showActions}
          userCenterId={userCenterId}
        />
      ))}
    </div>
  );
}
