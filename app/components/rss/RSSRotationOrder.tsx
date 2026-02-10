'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { RefreshCw, AlertTriangle, Newspaper } from 'lucide-react';
import DraggableRSSFeedItem, { RSSFeedInRotation } from './DraggableRSSFeedItem';

interface RSSFeed {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  is_in_rotation: boolean;
  error_count: number;
  last_fetched_at: string | null;
}

interface RSSRotationOrderProps {
  refreshKey?: number;
}

export default function RSSRotationOrder({ refreshKey = 0 }: RSSRotationOrderProps) {
  const [rotation, setRotation] = useState<RSSFeedInRotation[]>([]);
  const [notInRotation, setNotInRotation] = useState<RSSFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configure dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch rotation order and all feeds
      const [rotationRes, feedsRes] = await Promise.all([
        fetch('/api/rss/rotation'),
        fetch('/api/rss'),
      ]);

      if (!rotationRes.ok || !feedsRes.ok) {
        throw new Error('Error carregant les dades');
      }

      const rotationData = await rotationRes.json();
      const feedsData = await feedsRes.json();

      setRotation(rotationData.rotation || []);

      // Find feeds not in rotation
      const rotationFeedIds = (rotationData.rotation || []).map(
        (r: RSSFeedInRotation) => r.feed_id
      );
      const feedsNotInRotation = (feedsData.feeds || []).filter(
        (f: RSSFeed) => !rotationFeedIds.includes(f.id)
      );
      setNotInRotation(feedsNotInRotation);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = rotation.findIndex(item => item.feed_id === active.id);
    const newIndex = rotation.findIndex(item => item.feed_id === over.id);

    const newRotation = arrayMove(rotation, oldIndex, newIndex);
    setRotation(newRotation);

    // Save new order
    await saveRotation(newRotation);
  };

  const saveRotation = async (items: RSSFeedInRotation[]) => {
    setSaving(true);
    try {
      const feeds = items.map((item, index) => ({
        feed_id: item.feed_id,
        position: index,
      }));

      const res = await fetch('/api/rss/rotation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error guardant l'ordre");
      }
    } catch (err: any) {
      console.error('Error saving rotation:', err);
      setError(err.message);
      // Revert on error
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromRotation = async (feedId: string) => {
    const newRotation = rotation.filter(item => item.feed_id !== feedId);
    const removedItem = rotation.find(item => item.feed_id === feedId);

    if (removedItem) {
      setRotation(newRotation);
      setNotInRotation(prev => [
        ...prev,
        removedItem.rss_feeds,
      ]);

      await saveRotation(newRotation);
    }
  };

  const handleAddToRotation = async (feed: RSSFeed) => {
    // Add to rotation at the end
    const newRotationItem: RSSFeedInRotation = {
      feed_id: feed.id,
      position: rotation.length,
      rss_feeds: {
        id: feed.id,
        name: feed.name,
        url: feed.url,
        is_active: feed.is_active,
        is_in_rotation: true,
        error_count: feed.error_count,
        last_fetched_at: feed.last_fetched_at,
      },
    };

    const newRotation = [...rotation, newRotationItem];
    setRotation(newRotation);
    setNotInRotation(prev => prev.filter(f => f.id !== feed.id));

    await saveRotation(newRotation);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-16 bg-gray-100 rounded-lg animate-pulse"
          ></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        <p className="font-medium">Error carregant les dades</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Tornar a intentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        Arrossega els feeds per canviar l&apos;ordre de visualització a la pantalla
      </div>

      {/* Saving indicator */}
      {saving && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-sm text-blue-700 flex items-center gap-2">
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
          Guardant canvis...
        </div>
      )}

      {/* Feeds in rotation */}
      {rotation.length === 0 ? (
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-8 text-center">
          <RefreshCw className="w-10 h-10 text-[var(--color-gray)] mx-auto mb-3" />
          <p className="text-[var(--color-gray)]">
            Cap feed a la rotació
          </p>
          <p className="text-sm text-[var(--color-gray)] mt-1">
            Afegeix feeds des de la llista inferior
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rotation.map(r => r.feed_id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {rotation.map((item, index) => (
                <DraggableRSSFeedItem
                  key={item.feed_id}
                  item={item}
                  index={index}
                  onRemove={() => handleRemoveFromRotation(item.feed_id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Feeds not in rotation */}
      {notInRotation.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-border)]"></div>
            <span className="text-sm text-[var(--color-gray)]">
              No inclosos a la rotació
            </span>
            <div className="flex-1 h-px bg-[var(--color-border)]"></div>
          </div>

          <div className="space-y-2">
            {notInRotation.map(feed => (
              <div
                key={feed.id}
                className={`flex items-center gap-4 p-4 bg-gray-50 border border-[var(--color-border)] rounded-lg ${
                  feed.error_count >= 5 || !feed.is_active ? 'opacity-60' : ''
                }`}
              >
                <span className="flex-shrink-0">
                  {feed.error_count >= 5 || !feed.is_active ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <Newspaper className="w-5 h-5 text-[var(--color-secondary)]" />}
                </span>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-[var(--color-dark)] truncate">
                    {feed.name}
                  </h4>
                  <p className="text-xs text-[var(--color-gray)] truncate">
                    {feed.url}
                  </p>
                </div>

                <button
                  onClick={() => handleAddToRotation(feed)}
                  disabled={feed.error_count >= 5 || !feed.is_active}
                  className="px-3 py-1.5 text-sm bg-[var(--color-secondary)] hover:bg-[var(--color-primary)] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Afegir
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <p className="text-sm text-[var(--color-gray)] text-center">
        {rotation.length} {rotation.length === 1 ? 'feed' : 'feeds'} en rotació
        {notInRotation.length > 0 &&
          ` · ${notInRotation.length} no ${notInRotation.length === 1 ? 'inclòs' : 'inclosos'}`}
      </p>
    </div>
  );
}

export type { RSSRotationOrderProps };
