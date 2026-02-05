'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  addMonths,
  subMonths,
} from 'date-fns';
import { ca } from 'date-fns/locale';
import { useScheduleOverrides, ScheduleOverride } from '@/hooks/useScheduleOverrides';

interface ScheduleCalendarProps {
  centerId: string;
  playlistId: string;
  playlistName: string;
  canEdit: boolean;
}

type SelectionMode = 'individual' | 'range';

const WEEKDAY_HEADERS = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];

export default function ScheduleCalendar({
  centerId,
  playlistId,
  playlistName,
  canEdit,
}: ScheduleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('individual');
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { overrides, loading, error, upsertDates, deleteDates } = useScheduleOverrides({
    centerId,
    month: currentMonth,
  });

  // Build lookup maps
  const overridesByDate = useMemo(() => {
    const map = new Map<string, ScheduleOverride>();
    for (const o of overrides) {
      map.set(o.date, o);
    }
    return map;
  }, [overrides]);

  // Calendar days grid (Monday-start weeks)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const isPast = useCallback(
    (dateStr: string) => {
      return dateStr < todayStr;
    },
    [todayStr]
  );

  const handleDayClick = useCallback(
    (dateStr: string) => {
      if (!canEdit || isPast(dateStr)) return;

      if (selectionMode === 'individual') {
        setSelectedDates((prev) => {
          const next = new Set(prev);
          if (next.has(dateStr)) {
            next.delete(dateStr);
          } else {
            next.add(dateStr);
          }
          return next;
        });
      } else {
        // Range mode
        if (!rangeStart) {
          setRangeStart(dateStr);
          setSelectedDates(new Set([dateStr]));
        } else {
          // Select all days between rangeStart and this day
          const start = rangeStart < dateStr ? rangeStart : dateStr;
          const end = rangeStart < dateStr ? dateStr : rangeStart;
          const days = eachDayOfInterval({
            start: new Date(start + 'T00:00:00'),
            end: new Date(end + 'T00:00:00'),
          });
          const newSet = new Set<string>();
          for (const d of days) {
            const ds = format(d, 'yyyy-MM-dd');
            if (!isPast(ds)) {
              newSet.add(ds);
            }
          }
          setSelectedDates(newSet);
          setRangeStart(null);
        }
      }
      setActionError(null);
    },
    [canEdit, isPast, selectionMode, rangeStart]
  );

  const handleSchedule = async () => {
    if (selectedDates.size === 0) return;
    setSaving(true);
    setActionError(null);
    try {
      await upsertDates(playlistId, Array.from(selectedDates));
      setSelectedDates(new Set());
      setRangeStart(null);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSchedule = async () => {
    // Only remove dates that belong to THIS playlist
    const datesToRemove = Array.from(selectedDates).filter((d) => {
      const override = overridesByDate.get(d);
      return override && override.playlist_id === playlistId;
    });
    if (datesToRemove.length === 0) {
      setActionError('Cap dels dies seleccionats pertany a aquesta llista');
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await deleteDates(datesToRemove);
      setSelectedDates(new Set());
      setRangeStart(null);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const clearSelection = () => {
    setSelectedDates(new Set());
    setRangeStart(null);
    setActionError(null);
  };

  // Count selected days that are scheduled for THIS playlist (for remove action)
  const selectedOwnCount = Array.from(selectedDates).filter((d) => {
    const o = overridesByDate.get(d);
    return o && o.playlist_id === playlistId;
  }).length;

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Mes anterior"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h3 className="text-lg font-semibold text-[var(--color-dark)] font-[family-name:var(--font-montserrat)] capitalize">
          {format(currentMonth, 'LLLL yyyy', { locale: ca })}
        </h3>
        <button
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Mes següent"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin h-6 w-6 border-2 border-[var(--color-secondary)] border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      ) : (
        <>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_HEADERS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-[var(--color-gray)] py-1"
              >
                {day}
              </div>
            ))}

            {/* Day cells */}
            {calendarDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const inMonth = isSameMonth(day, currentMonth);
              const past = isPast(dateStr);
              const today = isToday(day);
              const override = overridesByDate.get(dateStr);
              const isOwnOverride = override?.playlist_id === playlistId;
              const isOtherOverride = override && !isOwnOverride;
              const isSelected = selectedDates.has(dateStr);
              const isRangeStartDay = rangeStart === dateStr;

              let cellClasses =
                'relative flex items-center justify-center h-10 rounded-lg text-sm transition-all select-none';

              if (!inMonth) {
                cellClasses += ' text-gray-300';
              } else if (past) {
                cellClasses += ' text-gray-400 opacity-50';
              } else if (isSelected && !isOwnOverride) {
                // Pending selection (not yet saved)
                cellClasses +=
                  ' bg-[var(--color-secondary)]/10 border-2 border-dashed border-[var(--color-secondary)] text-[var(--color-dark)] font-medium';
              } else if (isSelected && isOwnOverride) {
                // Selected AND already scheduled for this playlist
                cellClasses +=
                  ' bg-[var(--color-secondary)]/20 border-2 border-[var(--color-secondary)] text-[var(--color-dark)] font-medium';
              } else if (isOwnOverride) {
                // Scheduled for THIS playlist
                cellClasses +=
                  ' bg-[var(--color-secondary)]/15 border border-[var(--color-secondary)] text-[var(--color-dark)] font-medium';
              } else {
                cellClasses += ' text-[var(--color-dark)]';
              }

              if (canEdit && inMonth && !past) {
                cellClasses += ' cursor-pointer hover:bg-gray-100';
              }

              if (today) {
                cellClasses += ' ring-2 ring-[var(--color-accent)]';
              }

              if (isRangeStartDay) {
                cellClasses += ' ring-2 ring-[var(--color-primary)]';
              }

              return (
                <div
                  key={dateStr}
                  className={cellClasses}
                  onClick={() => inMonth && handleDayClick(dateStr)}
                  title={
                    isOwnOverride
                      ? `Programat: ${playlistName}`
                      : isOtherOverride
                        ? `Programat: ${override.playlist_name || 'Altra llista'}`
                        : undefined
                  }
                >
                  {format(day, 'd')}
                  {/* Dot for other playlist override */}
                  {isOtherOverride && inMonth && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--color-gray)]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-gray)]">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-[var(--color-secondary)]/15 border border-[var(--color-secondary)]" />
              Programat per aquesta llista
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-gray)]" />
              Programat per altra llista
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded ring-2 ring-[var(--color-accent)]" />
              Avui
            </div>
          </div>
        </>
      )}

      {/* Actions (only for editors) */}
      {canEdit && !loading && !error && (
        <div className="border-t border-[var(--color-border)] pt-4 space-y-3">
          {/* Selection mode toggle */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--color-gray)]">Mode:</span>
            <select
              value={selectionMode}
              onChange={(e) => {
                setSelectionMode(e.target.value as SelectionMode);
                clearSelection();
              }}
              className="border border-[var(--color-border)] rounded-lg px-2 py-1 text-sm bg-white"
            >
              <option value="individual">Dies individuals</option>
              <option value="range">Rang de dies</option>
            </select>
            {selectionMode === 'range' && rangeStart && (
              <span className="text-xs text-[var(--color-gray)]">
                Selecciona el dia final del rang
              </span>
            )}
          </div>

          {/* Selection info + actions */}
          {selectedDates.size > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-[var(--color-dark)]">
                {selectedDates.size}{' '}
                {selectedDates.size === 1 ? 'dia seleccionat' : 'dies seleccionats'}
              </span>

              <div className="flex gap-2 ml-auto">
                <button
                  onClick={clearSelection}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={saving}
                >
                  Cancel·lar
                </button>
                {selectedOwnCount > 0 && (
                  <button
                    onClick={handleRemoveSchedule}
                    disabled={saving}
                    className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Eliminant...' : 'Treure programació'}
                  </button>
                )}
                <button
                  onClick={handleSchedule}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm bg-[var(--color-secondary)] hover:bg-[var(--color-primary)] text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Programant...' : 'Programar'}
                </button>
              </div>
            </div>
          )}

          {/* Error message */}
          {actionError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              {actionError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
