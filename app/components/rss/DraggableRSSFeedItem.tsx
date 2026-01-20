'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RSSFeedInRotation {
  feed_id: string;
  position: number;
  rss_feeds: {
    id: string;
    name: string;
    url: string;
    is_active: boolean;
    is_in_rotation: boolean;
    error_count: number;
    last_fetched_at: string | null;
  };
}

interface DraggableRSSFeedItemProps {
  item: RSSFeedInRotation;
  index: number;
  onRemove: () => void;
}

export default function DraggableRSSFeedItem({
  item,
  index,
  onRemove,
}: DraggableRSSFeedItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.feed_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  const feed = item.rss_feeds;
  const hasErrors = feed.error_count >= 5 || !feed.is_active;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 bg-white border rounded-lg transition-shadow ${
        isDragging ? 'shadow-lg' : 'hover:shadow-md'
      } ${hasErrors ? 'border-red-200 bg-red-50' : 'border-[var(--color-border)]'}`}
    >
      {/* Drag handle */}
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

      {/* Position number */}
      <span className="text-sm font-semibold text-[var(--color-gray)] w-6 text-center flex-shrink-0">
        {index + 1}.
      </span>

      {/* Icon */}
      <span className="text-xl flex-shrink-0">{hasErrors ? '⚠️' : '📰'}</span>

      {/* Feed info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-[var(--color-dark)] truncate font-[family-name:var(--font-montserrat)]">
          {feed.name}
        </h4>
        <p className="text-xs text-[var(--color-gray)] truncate">{feed.url}</p>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {hasErrors ? (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
            Error
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
            Actiu
          </span>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="p-2 text-[var(--color-gray)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
        title="Treure de la rotació"
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
    </div>
  );
}

export type { RSSFeedInRotation, DraggableRSSFeedItemProps };
