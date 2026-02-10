'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Megaphone, LayoutList, Globe } from 'lucide-react';
import PlaylistCard, { Playlist } from './PlaylistCard';
import { useAuth } from '@/utils/supabase/useAuth';

interface PlaylistListProps {
  onCreatePlaylist?: () => void;
}

type FilterKind = 'all' | 'weekday' | 'custom' | 'global';

export default function PlaylistList({ onCreatePlaylist }: PlaylistListProps) {
  const router = useRouter();
  const { role, loading: authLoading } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [globalPlaylists, setGlobalPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKind>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filter !== 'all' && filter !== 'global') {
        params.append('kind', filter);
      }
      // Include global playlists for admin and editor_profe
      if (role !== 'editor_alumne') {
        params.append('includeGlobal', 'true');
      }

      const res = await fetch(`/api/playlists?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error carregant les llistes');
      }

      const data = await res.json();
      setPlaylists(data.playlists || []);
      setGlobalPlaylists(data.global_playlists || []);
    } catch (err: any) {
      console.error('Error fetching playlists:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, role]);

  useEffect(() => {
    if (!authLoading) {
      fetchPlaylists();
    }
  }, [fetchPlaylists, authLoading]);

  const handleEdit = (playlistId: string) => {
    router.push(`/llistes/${playlistId}/editar`);
  };

  const handleDelete = async (playlistId: string) => {
    if (deleteConfirm !== playlistId) {
      setDeleteConfirm(playlistId);
      return;
    }

    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error eliminant la llista');
      }

      // Refresh list
      fetchPlaylists();
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Error deleting playlist:', err);
      alert(err.message);
    }
  };

  const handleCopy = async (playlistId: string) => {
    if (!confirm('Vols copiar aquesta llista global al teu centre?')) {
      return;
    }

    try {
      const res = await fetch(`/api/playlists/${playlistId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // center_id s'omple automàticament per editor_profe
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error copiant la llista');
      }

      alert(data.message || 'Llista copiada correctament');
      fetchPlaylists(); // Refresca la llista per mostrar la còpia
    } catch (err: any) {
      console.error('Error copying playlist:', err);
      alert(err.message);
    }
  };

  // Order for weekday playlists (only Monday to Friday)
  const weekdayOrder: Record<string, number> = {
    'Dilluns': 1,
    'Dimarts': 2,
    'Dimecres': 3,
    'Dijous': 4,
    'Divendres': 5,
  };

  // Group playlists by kind for display
  // Filter out weekends (Dissabte, Diumenge) and sort by weekday order
  const weekdayPlaylists = playlists
    .filter(p => p.kind === 'weekday' && weekdayOrder[p.name] !== undefined)
    .sort((a, b) => (weekdayOrder[a.name] || 99) - (weekdayOrder[b.name] || 99));
  const announcementsPlaylists = playlists.filter(p => p.kind === 'announcements');
  const customPlaylists = playlists.filter(p => p.kind === 'custom');

  // Determine what to show based on filter
  const showWeekday = filter === 'all' || filter === 'weekday';
  const showCustom = filter === 'all' || filter === 'custom';
  const showGlobal = (filter === 'all' || filter === 'global') && role !== 'editor_alumne';

  // Permissions
  const canCreatePlaylist = role === 'editor_profe' || role === 'admin_global';
  const canEditPlaylists = role !== 'editor_alumne';
  const canDeletePlaylists = role === 'editor_profe' || role === 'admin_global';

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        <p className="font-medium">Error carregant les llistes</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchPlaylists}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Tornar a intentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-[var(--color-secondary)] text-white'
              : 'bg-white border border-[var(--color-border)] text-[var(--color-dark)] hover:bg-[var(--color-light-bg)]'
          }`}
        >
          Totes
        </button>
        <button
          onClick={() => setFilter('weekday')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'weekday'
              ? 'bg-[var(--color-secondary)] text-white'
              : 'bg-white border border-[var(--color-border)] text-[var(--color-dark)] hover:bg-[var(--color-light-bg)]'
          }`}
        >
          Predefinides
        </button>
        <button
          onClick={() => setFilter('custom')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'custom'
              ? 'bg-[var(--color-secondary)] text-white'
              : 'bg-white border border-[var(--color-border)] text-[var(--color-dark)] hover:bg-[var(--color-light-bg)]'
          }`}
        >
          Personalitzades
        </button>
        {role !== 'editor_alumne' && (
          <button
            onClick={() => setFilter('global')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'global'
                ? 'bg-[var(--color-secondary)] text-white'
                : 'bg-white border border-[var(--color-border)] text-[var(--color-dark)] hover:bg-[var(--color-light-bg)]'
            }`}
          >
            Globals
          </button>
        )}
      </div>

      {/* Weekday playlists section */}
      {showWeekday && weekdayPlaylists.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-dark)] mb-3 font-[family-name:var(--font-montserrat)] flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Llistes Predefinides (Dies de la setmana)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weekdayPlaylists.map(playlist => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onEdit={handleEdit}
                canEdit={canEditPlaylists}
                canDelete={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* Announcements playlist section */}
      {showWeekday && announcementsPlaylists.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-dark)] mb-3 font-[family-name:var(--font-montserrat)] flex items-center gap-2">
            <Megaphone className="w-5 h-5" /> Llista d&apos;Anuncis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcementsPlaylists.map(playlist => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onEdit={handleEdit}
                canEdit={canEditPlaylists}
                canDelete={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* Custom playlists section */}
      {showCustom && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[var(--color-dark)] font-[family-name:var(--font-montserrat)] flex items-center gap-2">
              <LayoutList className="w-5 h-5" /> Llistes Personalitzades
            </h2>
            {canCreatePlaylist && onCreatePlaylist && (
              <button
                onClick={onCreatePlaylist}
                className="px-4 py-2 bg-[var(--color-secondary)] hover:bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium transition-colors"
              >
                + Nova Llista
              </button>
            )}
          </div>

          {customPlaylists.length === 0 ? (
            <div className="bg-white border border-[var(--color-border)] rounded-xl p-8 text-center">
              <LayoutList className="w-10 h-10 text-[var(--color-gray)] mx-auto mb-3" />
              <p className="text-[var(--color-gray)] mb-4">
                Encara no tens llistes personalitzades
              </p>
              {canCreatePlaylist && onCreatePlaylist && (
                <button
                  onClick={onCreatePlaylist}
                  className="px-4 py-2 bg-[var(--color-secondary)] hover:bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Crear la primera llista
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customPlaylists.map(playlist => (
                <div key={playlist.id} className="relative">
                  <PlaylistCard
                    playlist={playlist}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    canEdit={canEditPlaylists}
                    canDelete={canDeletePlaylists}
                  />
                  {/* Delete confirmation overlay */}
                  {deleteConfirm === playlist.id && (
                    <div className="absolute inset-0 bg-white/95 rounded-xl flex items-center justify-center">
                      <div className="text-center p-4">
                        <p className="text-sm text-[var(--color-dark)] mb-3">
                          Eliminar &quot;{playlist.name}&quot;?
                        </p>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            Cancel·lar
                          </button>
                          <button
                            onClick={() => handleDelete(playlist.id)}
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
          )}
        </section>
      )}

      {/* Global playlists section */}
      {showGlobal && globalPlaylists.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-dark)] mb-3 font-[family-name:var(--font-montserrat)] flex items-center gap-2">
            <Globe className="w-5 h-5" /> Llista Global
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalPlaylists.map(playlist => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onEdit={role === 'admin_global' ? handleEdit : undefined}
                onCopy={role === 'editor_profe' ? handleCopy : undefined}
                isGlobal
                canEdit={role === 'admin_global'}
                canDelete={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state when everything is filtered out */}
      {!showWeekday &&
        !showCustom &&
        filter === 'global' &&
        globalPlaylists.length === 0 && (
          <div className="bg-white border border-[var(--color-border)] rounded-xl p-8 text-center">
            <Globe className="w-10 h-10 text-[var(--color-gray)] mx-auto mb-3" />
            <p className="text-[var(--color-gray)]">
              No hi ha llista global configurada
            </p>
          </div>
        )}
    </div>
  );
}

export type { PlaylistListProps, FilterKind };
