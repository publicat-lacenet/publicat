import { useCallback, useEffect, useRef, useState } from 'react';
import { Video } from '@/app/components/videos/VideoCard';

interface FilterState {
  search: string;
  centerId: string | null;
  zoneId: string | null;
  type: 'all' | 'content' | 'announcement';
  tagIds: string[];
  hashtagIds: string[];
  includeShared: boolean;
}

interface UseVideosOptions {
  filters: FilterState;
  page: number;
  limit: number;
  enabled?: boolean;
}

export function useVideos(options: UseVideosOptions) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Serializar filtros para comparación estable
  const filtersKey = JSON.stringify(options.filters);
  const prevFiltersKeyRef = useRef(filtersKey);
  const isFetchingRef = useRef(false);

  const fetchVideos = useCallback(async () => {
    // Evitar llamadas duplicadas
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: options.page.toString(),
        limit: options.limit.toString(),
      });

      const filters = options.filters;
      if (filters.centerId) {
        params.append('centerId', filters.centerId);
      }
      if (filters.zoneId) {
        params.append('zoneId', filters.zoneId);
      }
      if (filters.type !== 'all') {
        params.append('type', filters.type);
      }
      if (filters.tagIds.length > 0) {
        params.append('tagIds', filters.tagIds.join(','));
      }
      if (filters.hashtagIds.length > 0) {
        params.append('hashtagIds', filters.hashtagIds.join(','));
      }
      if (filters.includeShared) {
        params.append('includeShared', 'true');
      }
      if (filters.search) {
        params.append('search', filters.search);
      }

      const res = await fetch(`/api/videos?${params}`);
      const data = await res.json();

      if (res.ok) {
        setVideos(data.videos);
        setTotal(data.total);
      } else {
        setError(data.error || 'Error carregant vídeos');
      }
    } catch (err) {
      setError('Error de connexió');
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, options.page, options.limit]);

  useEffect(() => {
    if (options.enabled === false) {
      return;
    }
    
    // Solo fetch si los filtros cambiaron realmente
    prevFiltersKeyRef.current = filtersKey;
    fetchVideos();
  }, [options.enabled, fetchVideos, filtersKey]);

  return {
    videos,
    loading,
    error,
    total,
    totalPages: Math.ceil(total / options.limit),
    refetch: fetchVideos,
  };
}
