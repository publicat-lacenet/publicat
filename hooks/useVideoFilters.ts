import { useState, useCallback, useMemo } from 'react';

interface UseVideoFiltersOptions {
  syncWithUrl?: boolean;
}

interface UseVideoFiltersReturn {
  selectedTagIds: string[];
  selectedHashtagIds: string[];
  selectedZoneId: string | null;
  activeFilterCount: number;
  setTagIds: (ids: string[]) => void;
  setHashtagIds: (ids: string[]) => void;
  setZoneId: (id: string | null) => void;
  clearAll: () => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export function useVideoFilters(_options?: UseVideoFiltersOptions): UseVideoFiltersReturn {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedHashtagIds, setSelectedHashtagIds] = useState<string[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const activeFilterCount = useMemo(
    () => selectedTagIds.length + selectedHashtagIds.length + (selectedZoneId ? 1 : 0),
    [selectedTagIds, selectedHashtagIds, selectedZoneId]
  );

  const setTagIds = useCallback((ids: string[]) => {
    setSelectedTagIds(ids);
  }, []);

  const setHashtagIds = useCallback((ids: string[]) => {
    setSelectedHashtagIds(ids);
  }, []);

  const setZoneId = useCallback((id: string | null) => {
    setSelectedZoneId(id);
  }, []);

  const clearAll = useCallback(() => {
    setSelectedTagIds([]);
    setSelectedHashtagIds([]);
    setSelectedZoneId(null);
  }, []);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  return {
    selectedTagIds,
    selectedHashtagIds,
    selectedZoneId,
    activeFilterCount,
    setTagIds,
    setHashtagIds,
    setZoneId,
    clearAll,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
  };
}
