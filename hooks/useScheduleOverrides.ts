import { useCallback, useEffect, useRef, useState } from 'react';

export interface ScheduleOverride {
  id: string;
  date: string;
  playlist_id: string;
  playlist_name: string | null;
  created_at: string;
}

interface UseScheduleOverridesOptions {
  centerId: string;
  month: Date;
}

export function useScheduleOverrides({ centerId, month }: UseScheduleOverridesOptions) {
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;

  const fetchOverrides = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        centerId,
        month: monthKey,
      });

      const res = await fetch(`/api/schedule-overrides?${params}`);
      const data = await res.json();

      if (res.ok) {
        setOverrides(data.overrides);
      } else {
        setError(data.error || 'Error carregant les programacions');
      }
    } catch {
      setError('Error de connexió');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [centerId, monthKey]);

  useEffect(() => {
    fetchOverrides();
  }, [fetchOverrides]);

  const upsertDates = useCallback(async (playlistId: string, dates: string[]) => {
    const res = await fetch('/api/schedule-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistId, dates }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error programant les dates');
    }

    await fetchOverrides();
    return data;
  }, [fetchOverrides]);

  const deleteDates = useCallback(async (dates: string[]) => {
    const res = await fetch('/api/schedule-overrides/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dates }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error eliminant les programacions');
    }

    await fetchOverrides();
    return data;
  }, [fetchOverrides]);

  return {
    overrides,
    loading,
    error,
    upsertDates,
    deleteDates,
    refetch: fetchOverrides,
  };
}
