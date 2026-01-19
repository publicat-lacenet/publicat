'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PlaylistItem {
  id: string;
  position: number;
  video: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    duration_seconds: number | null;
    type: string;
    centers: {
      id: string;
      name: string;
      zones?: {
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
  };
  added_at: string;
}

interface DraggableVideoItemProps {
  item: PlaylistItem;
  index: number;
  onRemove: () => void;
  canEdit: boolean;
}

export default function DraggableVideoItem({
  item,
  index,
  onRemove,
  canEdit,
}: DraggableVideoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const tags = item.video.video_tags?.map(vt => vt.tags).filter(Boolean) || [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 bg-white border border-[var(--color-border)] rounded-lg transition-shadow ${
        isDragging ? 'shadow-lg' : 'hover:shadow-md'
      }`}
    >
      {/* Drag handle */}
      {canEdit && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-[var(--color-gray)] hover:text-[var(--color-dark)] p-1 -ml-2"
          title="Arrossega per reordenar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </div>
      )}

      {/* Position number */}
      <span className="text-sm font-semibold text-[var(--color-gray)] w-6 text-center flex-shrink-0">
        {index + 1}.
      </span>

      {/* Thumbnail */}
      <div className="w-24 h-14 flex-shrink-0 bg-[var(--color-light-bg)] rounded overflow-hidden">
        {item.video.thumbnail_url ? (
          <img
            src={item.video.thumbnail_url}
            alt={item.video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            📹
          </div>
        )}
      </div>

      {/* Video info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-[var(--color-dark)] truncate font-[family-name:var(--font-montserrat)]">
          {item.video.title}
        </h3>
        <p className="text-sm text-[var(--color-gray)] font-[family-name:var(--font-inter)]">
          {item.video.centers?.name || 'Centre desconegut'}
          {item.video.centers?.zones?.name && ` · ${item.video.centers.zones.name}`}
          {item.video.duration_seconds && ` · ${formatDuration(item.video.duration_seconds)}`}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.slice(0, 3).map(tag => (
              <span
                key={tag.id}
                className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium"
              >
                {tag.name}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-[var(--color-gray)]">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Type badge */}
      <span
        className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
          item.video.type === 'announcement'
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-blue-100 text-blue-700'
        }`}
      >
        {item.video.type === 'announcement' ? 'Anunci' : 'Contingut'}
      </span>

      {/* Remove button */}
      {canEdit && (
        <button
          onClick={onRemove}
          className="p-2 text-[var(--color-gray)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
          title="Eliminar de la llista"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

export type { PlaylistItem, DraggableVideoItemProps };
