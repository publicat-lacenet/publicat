'use client';

import { formatDistanceToNow } from 'date-fns';
import { ca } from 'date-fns/locale';
import { AlertTriangle, Newspaper, RefreshCw, RotateCw, Pencil, Trash2 } from 'lucide-react';

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
            {hasErrors ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <Newspaper className="w-5 h-5 text-[var(--color-secondary)]" />}
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
              <RefreshCw className="w-[18px] h-[18px]" />
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
              <RotateCw className="w-[18px] h-[18px]" />
            </button>
          )}

          <button
            onClick={onEdit}
            className="p-2 text-[var(--color-gray)] hover:text-[var(--color-dark)] hover:bg-gray-100 rounded-lg transition-colors"
            title="Editar"
          >
            <Pencil className="w-[18px] h-[18px]" />
          </button>

          <button
            onClick={onDelete}
            className="p-2 text-[var(--color-gray)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export type { RSSFeed, RSSFeedCardProps };
