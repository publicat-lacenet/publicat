'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';

interface RSSItem {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  pub_date?: string | null;
  link?: string | null;
}

interface RSSFeed {
  id: string;
  name: string;
  items: RSSItem[];
}

interface RSSZoneProps {
  centerId: string;
  secondsPerItem?: number;
  secondsPerFeed?: number;
  onError?: (error: Error) => void;
}

export default function RSSZone({
  centerId,
  secondsPerItem = 15,
  secondsPerFeed = 120,
  onError,
}: RSSZoneProps) {
  const [feeds, setFeeds] = useState<RSSFeed[]>([]);
  const [currentFeedIndex, setCurrentFeedIndex] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const itemIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const feedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const feedStartTimeRef = useRef<number>(Date.now());

  // Fetch RSS feeds
  const fetchFeeds = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/rss?centerId=${centerId}&onlyInRotation=true&includeItems=true`
      );

      if (!response.ok) {
        throw new Error('Error fetching RSS feeds');
      }

      const data = await response.json();

      // Filter feeds with items and transform to our format
      const feedsWithItems: RSSFeed[] = (data.feeds || [])
        .filter((feed: { items?: RSSItem[] }) => feed.items && feed.items.length > 0)
        .map((feed: { id: string; name: string; items: RSSItem[] }) => ({
          id: feed.id,
          name: feed.name,
          items: feed.items.slice(0, 10), // Limit to 10 items per feed
        }));

      setFeeds(feedsWithItems);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching RSS:', error);
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
      setIsLoading(false);
    }
  }, [centerId, onError]);

  // Initial fetch
  useEffect(() => {
    fetchFeeds();

    // Refresh feeds every 30 minutes
    const refreshInterval = setInterval(fetchFeeds, 30 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [fetchFeeds]);

  // Item rotation
  useEffect(() => {
    if (feeds.length === 0) return;

    const currentFeed = feeds[currentFeedIndex];
    if (!currentFeed || !currentFeed.items.length) return;

    itemIntervalRef.current = setInterval(() => {
      setIsTransitioning(true);

      setTimeout(() => {
        setCurrentItemIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % currentFeed.items.length;
          return nextIndex;
        });
        setIsTransitioning(false);
      }, 300);
    }, secondsPerItem * 1000);

    return () => {
      if (itemIntervalRef.current) {
        clearInterval(itemIntervalRef.current);
      }
    };
  }, [feeds, currentFeedIndex, secondsPerItem]);

  // Feed rotation
  useEffect(() => {
    if (feeds.length <= 1) return;

    feedStartTimeRef.current = Date.now();

    feedIntervalRef.current = setInterval(() => {
      setIsTransitioning(true);

      setTimeout(() => {
        setCurrentFeedIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % feeds.length;
          return nextIndex;
        });
        setCurrentItemIndex(0);
        setIsTransitioning(false);
        feedStartTimeRef.current = Date.now();
      }, 300);
    }, secondsPerFeed * 1000);

    return () => {
      if (feedIntervalRef.current) {
        clearInterval(feedIntervalRef.current);
      }
    };
  }, [feeds.length, secondsPerFeed]);

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Carregant notícies...</div>
      </div>
    );
  }

  // No feeds available
  if (feeds.length === 0) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 text-sm">Sense notícies</div>
      </div>
    );
  }

  const currentFeed = feeds[currentFeedIndex];
  const currentItem = currentFeed?.items[currentItemIndex];

  if (!currentItem) {
    return null;
  }

  return (
    <div className="w-full h-full bg-gray-900 overflow-hidden flex flex-col">
      {/* Feed name header */}
      <div className="flex-shrink-0 px-5 py-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <span className="text-base text-gray-300 font-medium uppercase tracking-wide">
          {currentFeed.name}
        </span>
        {feeds.length > 1 && (
          <span className="text-sm text-gray-500">
            {currentFeedIndex + 1}/{feeds.length}
          </span>
        )}
      </div>

      {/* Item content */}
      <div
        className={`flex-1 p-5 flex flex-col transition-all duration-300 min-h-0 ${
          isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Image if available - aspect ratio 16:9 */}
        {currentItem.image_url && (
          <div className="flex-shrink-0 mb-4 relative aspect-video rounded-lg overflow-hidden">
            <Image
              src={currentItem.image_url}
              alt={currentItem.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        {/* Title with accent line */}
        <div className="flex gap-3">
          <div className="w-1 bg-yellow-500 flex-shrink-0 rounded-full" />
          <h3 className="text-white text-xl font-semibold leading-snug line-clamp-3">
            {currentItem.title}
          </h3>
        </div>

        {/* Description - always show if available */}
        {currentItem.description && (
          <p className="mt-3 ml-4 text-gray-400 text-base leading-relaxed line-clamp-4 flex-1">
            {currentItem.description}
          </p>
        )}
      </div>

      {/* Progress indicator */}
      <div className="flex-shrink-0 h-1.5 bg-gray-800">
        <div
          className="h-full bg-yellow-500 transition-all duration-1000"
          style={{
            width: `${((currentItemIndex + 1) / currentFeed.items.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
