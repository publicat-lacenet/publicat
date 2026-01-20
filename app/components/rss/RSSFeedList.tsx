'use client';

import { useState, useEffect, useCallback } from 'react';
import RSSFeedCard, { RSSFeed } from './RSSFeedCard';

interface RSSFeedListProps {
  onEdit: (feed: RSSFeed) => void;
  onDelete: (feedId: string) => void;
  onCreateClick: () => void;
  refreshKey?: number;
}

export default function RSSFeedList({
  onEdit,
  onDelete,
  onCreateClick,
  refreshKey = 0,
}: RSSFeedListProps) {
  const [feeds, setFeeds] = useState<RSSFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchFeeds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/rss');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error carregant els feeds');
      }

      const data = await res.json();
      setFeeds(data.feeds || []);
    } catch (err: any) {
      console.error('Error fetching feeds:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds, refreshKey]);

  const handleRetry = async (feedId: string) => {
    setRetrying(feedId);
    try {
      const res = await fetch(`/api/rss/${feedId}/retry`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error reintentant el feed');
      }

      // Refresh list
      await fetchFeeds();
    } catch (err: any) {
      console.error('Error retrying feed:', err);
      alert('Error: ' + err.message);
    } finally {
      setRetrying(null);
    }
  };

  const handleToggleRotation = async (feed: RSSFeed) => {
    try {
      const res = await fetch(`/api/rss/${feed.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_in_rotation: !feed.is_in_rotation }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error actualitzant el feed');
      }

      // Refresh list
      await fetchFeeds();
    } catch (err: any) {
      console.error('Error toggling rotation:', err);
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteClick = (feedId: string) => {
    if (deleteConfirm === feedId) {
      onDelete(feedId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(feedId);
    }
  };

  // Separate feeds by status
  const activeFeeds = feeds.filter(f => f.is_active && f.error_count < 5);
  const errorFeeds = feeds.filter(f => !f.is_active || f.error_count >= 5);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-gray-100 rounded-xl animate-pulse"
          ></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        <p className="font-medium">Error carregant els feeds</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchFeeds}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Tornar a intentar
        </button>
      </div>
    );
  }

  if (feeds.length === 0) {
    return (
      <div className="bg-white border border-[var(--color-border)] rounded-xl p-12 text-center">
        <div className="text-5xl mb-4">📡</div>
        <h3 className="text-lg font-semibold text-[var(--color-dark)] mb-2 font-[family-name:var(--font-montserrat)]">
          Cap feed RSS configurat
        </h3>
        <p className="text-[var(--color-gray)] mb-4 font-[family-name:var(--font-inter)]">
          Afegeix feeds RSS per mostrar notícies i contingut extern a les pantalles
        </p>
        <button
          onClick={onCreateClick}
          className="px-4 py-2 bg-[var(--color-secondary)] hover:bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Afegir primer feed
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active feeds */}
      {activeFeeds.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[var(--color-gray)] uppercase tracking-wider">
            Feeds Actius ({activeFeeds.length})
          </h3>
          <div className="space-y-3">
            {activeFeeds.map(feed => (
              <div key={feed.id} className="relative">
                <RSSFeedCard
                  feed={feed}
                  onEdit={() => onEdit(feed)}
                  onDelete={() => handleDeleteClick(feed.id)}
                  onToggleRotation={() => handleToggleRotation(feed)}
                  onRetry={retrying === feed.id ? undefined : () => handleRetry(feed.id)}
                  showRetry={feed.error_count > 0}
                />
                {/* Delete confirmation overlay */}
                {deleteConfirm === feed.id && (
                  <div className="absolute inset-0 bg-white/95 rounded-xl flex items-center justify-center">
                    <div className="text-center p-4">
                      <p className="text-sm text-[var(--color-dark)] mb-3">
                        Eliminar aquest feed?
                      </p>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          Cancel·lar
                        </button>
                        <button
                          onClick={() => handleDeleteClick(feed.id)}
                          className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error feeds */}
      {errorFeeds.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-red-600 uppercase tracking-wider">
            Feeds amb Errors ({errorFeeds.length})
          </h3>
          <div className="space-y-3">
            {errorFeeds.map(feed => (
              <div key={feed.id} className="relative">
                <RSSFeedCard
                  feed={feed}
                  onEdit={() => onEdit(feed)}
                  onDelete={() => handleDeleteClick(feed.id)}
                  onRetry={retrying === feed.id ? undefined : () => handleRetry(feed.id)}
                  showRetry={true}
                />
                {/* Delete confirmation overlay */}
                {deleteConfirm === feed.id && (
                  <div className="absolute inset-0 bg-white/95 rounded-xl flex items-center justify-center">
                    <div className="text-center p-4">
                      <p className="text-sm text-[var(--color-dark)] mb-3">
                        Eliminar aquest feed?
                      </p>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          Cancel·lar
                        </button>
                        <button
                          onClick={() => handleDeleteClick(feed.id)}
                          className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retry indicator */}
      {retrying && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Reintentant...
        </div>
      )}
    </div>
  );
}

export type { RSSFeedListProps };
