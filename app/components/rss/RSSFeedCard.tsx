'use client';

import { formatDistanceToNow } from 'date-fns';
import { ca } from 'date-fns/locale';

interface RSSFeed {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  is_in_rotation: boolean;
  last_fetched_at: string | null;
  last_error: string | null;
  error_count: number;
  item_count: number;
  created_at: string;
  centers?: {
    id: string;
    name: string;
  } | null;
}

interface RSSFeedCardProps {
  feed: RSSFeed;
  onEdit: () => void;
  onDelete: () => void;
  onRetry?: () => void;
  onToggleRotation?: () => void;
  showRetry?: boolean;
}

export default function RSSFeedCard({
  feed,
  onEdit,
  onDelete,
  onRetry,
  onToggleRotation,
  showRetry = false,
}: RSSFeedCardProps) {
  const hasErrors = feed.error_count >= 5 || !feed.is_active;
  const isWarning = feed.error_count > 0 && feed.error_count < 5;

  const formatLastFetched = () => {
    if (!feed.last_fetched_at) return 'Mai actualitzat';
    try {
      return `Actualitzat ${formatDistanceToNow(new Date(feed.last_fetched_at), {
        addSuffix: true,
        locale: ca,
      })}`;
    } catch {
      return 'Data desconeguda';
    }
  };

  return (
    <div
      className={`bg-white border rounded-xl p-4 transition-shadow hover:shadow-md ${
        hasErrors
          ? 'border-red-200 bg-red-50'
          : isWarning
          ? 'border-yellow-200 bg-yellow-50'
          : 'border-[var(--color-border)]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">
              {hasErrors ? '⚠️' : '📰'}
            </span>
            <h3 className="font-semibold text-[var(--color-dark)] truncate font-[family-name:var(--font-montserrat)]">
              {feed.name}
            </h3>
          </div>

          {/* URL */}
          <p className="text-xs text-[var(--color-gray)] truncate mb-2">
            {feed.url}
          </p>

          {/* Status badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {feed.is_active && !hasErrors ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded">
                Actiu
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded">
                Desactivat
              </span>
            )}

            {feed.is_in_rotation ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                En rotació
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                No en rotació
              </span>
            )}

            <span className="text-[var(--color-gray)]">·</span>
            <span className="text-[var(--color-gray)]">{formatLastFetched()}</span>
            <span className="text-[var(--color-gray)]">·</span>
            <span className="text-[var(--color-gray)]">{feed.item_count} ítems</span>

            {feed.error_count > 0 && (
              <>
                <span className="text-[var(--color-gray)]">·</span>
                <span className={feed.error_count >= 5 ? 'text-red-600' : 'text-yellow-600'}>
                  {feed.error_count} {feed.error_count === 1 ? 'error' : 'errors'}
                </span>
              </>
            )}
          </div>

          {/* Error message */}
          {feed.last_error && hasErrors && (
            <div className="mt-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
              Últim error: {feed.last_error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {showRetry && onRetry && (
            <button
              onClick={onRetry}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Reintentar"
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
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 16h5v5" />
              </svg>
            </button>
          )}

          {onToggleRotation && (
            <button
              onClick={onToggleRotation}
              className={`p-2 rounded-lg transition-colors ${
                feed.is_in_rotation
                  ? 'text-blue-600 hover:bg-blue-50'
                  : 'text-gray-400 hover:bg-gray-100'
              }`}
              title={feed.is_in_rotation ? 'Treure de la rotació' : 'Afegir a la rotació'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={feed.is_in_rotation ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </button>
          )}

          <button
            onClick={onEdit}
            className="p-2 text-[var(--color-gray)] hover:text-[var(--color-dark)] hover:bg-gray-100 rounded-lg transition-colors"
            title="Editar"
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
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>

          <button
            onClick={onDelete}
            className="p-2 text-[var(--color-gray)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar"
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
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export type { RSSFeed, RSSFeedCardProps };
