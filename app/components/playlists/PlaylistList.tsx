'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  CheckCircle2,
  Globe,
  LayoutList,
  type LucideIcon,
  Megaphone,
  Repeat,
} from 'lucide-react';
import PlaylistCard, { Playlist } from './PlaylistCard';
import { useAuth } from '@/utils/supabase/useAuth';

interface PlaylistListProps {
  onCreatePlaylist?: () => void;
}

type DefaultPlaylistMode = 'permanent' | 'weekday';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function PlaylistList({ onCreatePlaylist }: PlaylistListProps) {
  const router = useRouter();
  const { role, centerId, loading: authLoading } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [globalPlaylists, setGlobalPlaylists] = useState<Playlist[]>([]);
  const [defaultPlaylistMode, setDefaultPlaylistMode] =
    useState<DefaultPlaylistMode>('permanent');
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (role !== 'editor_alumne') {
        params.append('includeGlobal', 'true');
      }

      const settingsParams = new URLSearchParams();
      if (centerId) {
        settingsParams.set('centerId', centerId);
      }

      const [playlistsRes, settingsRes] = await Promise.all([
        fetch(`/api/playlists?${params.toString()}`),
        fetch(`/api/display/settings?${settingsParams.toString()}`),
      ]);

      if (!playlistsRes.ok) {
        const data = await playlistsRes.json();
        throw new Error(data.error || 'Error carregant les llistes');
      }

      const playlistsData = await playlistsRes.json();
      setPlaylists(playlistsData.playlists || []);
      setGlobalPlaylists(playlistsData.global_playlists || []);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setDefaultPlaylistMode(
          settingsData.settings?.default_playlist_mode === 'weekday'
            ? 'weekday'
            : 'permanent'
        );
      }
    } catch (err: unknown) {
      console.error('Error fetching playlists:', err);
      setError(getErrorMessage(err, 'Error carregant les llistes'));
    } finally {
      setLoading(false);
    }
  }, [centerId, role]);

  useEffect(() => {
    if (!authLoading) {
      fetchPlaylists();
    }
  }, [fetchPlaylists, authLoading]);

  const handleEdit = (playlistId: string) => {
    router.push(`/llistes/${playlistId}/editar`);
  };

  const handleModeChange = async (mode: DefaultPlaylistMode) => {
    if (mode === defaultPlaylistMode || savingMode) return;
    if (role !== 'editor_profe' && role !== 'admin_global') return;

    const previousMode = defaultPlaylistMode;
    setDefaultPlaylistMode(mode);
    setSavingMode(true);
    setError(null);

    try {
      const res = await fetch('/api/display/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          center_id: centerId,
          default_playlist_mode: mode,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error guardant el mode de reproducció');
      }
    } catch (err: unknown) {
      setDefaultPlaylistMode(previousMode);
      setError(getErrorMessage(err, 'Error guardant el mode de reproducció'));
    } finally {
      setSavingMode(false);
    }
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

      fetchPlaylists();
      setDeleteConfirm(null);
    } catch (err: unknown) {
      console.error('Error deleting playlist:', err);
      alert(getErrorMessage(err, 'Error eliminant la llista'));
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
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error copiant la llista');
      }

      alert(data.message || 'Llista copiada correctament');
      fetchPlaylists();
    } catch (err: unknown) {
      console.error('Error copying playlist:', err);
      alert(getErrorMessage(err, 'Error copiant la llista'));
    }
  };

  const weekdayOrder: Record<string, number> = {
    Dilluns: 1,
    Dimarts: 2,
    Dimecres: 3,
    Dijous: 4,
    Divendres: 5,
  };

  const permanentPlaylists = playlists.filter(p => p.kind === 'permanent');
  const weekdayPlaylists = playlists
    .filter(p => p.kind === 'weekday' && weekdayOrder[p.name] !== undefined)
    .sort((a, b) => (weekdayOrder[a.name] || 99) - (weekdayOrder[b.name] || 99));
  const customPlaylists = playlists.filter(p => p.kind === 'custom');
  const announcementsPlaylists = playlists.filter(p => p.kind === 'announcements');

  const canCreatePlaylist = role === 'editor_profe' || role === 'admin_global';
  const canManageMode = role === 'editor_profe' || role === 'admin_global';
  const canEditPlaylist = (playlist: Playlist) => {
    if (role === 'admin_global') return true;
    if (role === 'editor_profe') return true;
    if (role === 'editor_alumne' && playlist.is_student_editable) return true;
    return false;
  };
  const canDeletePlaylists = role === 'editor_profe' || role === 'admin_global';

  const modeOptions: {
    value: DefaultPlaylistMode;
    title: string;
    description: string;
    icon: LucideIcon;
  }[] = [
    {
      value: 'permanent',
      title: 'Llista permanent',
      description: 'Es mostra cada dia si no hi ha cap llista amb calendari activa.',
      icon: Repeat,
    },
    {
      value: 'weekday',
      title: 'Llistes per dia de la setmana',
      description: 'Una llista diferent per a dilluns, dimarts, dimecres, dijous i divendres.',
      icon: Calendar,
    },
  ];

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
    <div className="space-y-8">
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-[var(--color-dark)] font-[family-name:var(--font-montserrat)]">
            Mode habitual de reproducció
          </h2>
          <p className="text-sm text-[var(--color-gray)]">
            Les llistes amb calendari sempre passen per sobre del mode habitual.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {modeOptions.map(option => {
            const Icon = option.icon;
            const isSelected = defaultPlaylistMode === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleModeChange(option.value)}
                disabled={!canManageMode || savingMode}
                className={`min-h-[112px] text-left border-2 rounded-lg p-4 transition-colors ${
                  isSelected
                    ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)]/10'
                    : canManageMode
                      ? 'border-[var(--color-border)] bg-white hover:border-[var(--color-secondary)]/50'
                      : 'border-[var(--color-border)] bg-gray-50 opacity-75'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 text-[var(--color-secondary)] mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--color-dark)]">
                        {option.title}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[var(--color-secondary)] flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-gray)] mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {defaultPlaylistMode === 'permanent' && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-dark)] mb-3 font-[family-name:var(--font-montserrat)] flex items-center gap-2">
            <Repeat className="w-5 h-5" /> Llista permanent
          </h2>
          {permanentPlaylists.length === 0 ? (
            <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 text-sm text-[var(--color-gray)]">
              Encara no existeix la llista permanent d&apos;aquest centre.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {permanentPlaylists.map(playlist => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onEdit={handleEdit}
                  canEdit={canEditPlaylist(playlist)}
                  canDelete={false}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {defaultPlaylistMode === 'weekday' && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-dark)] mb-3 font-[family-name:var(--font-montserrat)] flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Llistes per dia de la setmana
          </h2>
          {weekdayPlaylists.length === 0 ? (
            <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 text-sm text-[var(--color-gray)]">
              Encara no existeixen les llistes per dia de la setmana d&apos;aquest centre.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weekdayPlaylists.map(playlist => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onEdit={handleEdit}
                  canEdit={canEditPlaylist(playlist)}
                  canDelete={false}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold text-[var(--color-dark)] font-[family-name:var(--font-montserrat)] flex items-center gap-2">
            <LayoutList className="w-5 h-5" /> Llistes amb calendari
          </h2>
          {canCreatePlaylist && onCreatePlaylist && (
            <button
              onClick={onCreatePlaylist}
              className="px-4 py-2 bg-[var(--color-secondary)] hover:bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium transition-colors"
            >
              + Nova llista amb calendari
            </button>
          )}
        </div>

        {customPlaylists.length === 0 ? (
          <div className="bg-white border border-[var(--color-border)] rounded-xl p-8 text-center">
            <LayoutList className="w-10 h-10 text-[var(--color-gray)] mx-auto mb-3" />
            <p className="text-[var(--color-gray)] mb-4">
              Encara no tens llistes amb calendari
            </p>
            {canCreatePlaylist && onCreatePlaylist && (
              <button
                onClick={onCreatePlaylist}
                className="px-4 py-2 bg-[var(--color-secondary)] hover:bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Crear la primera llista amb calendari
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
                  canEdit={canEditPlaylist(playlist)}
                  canDelete={canDeletePlaylists}
                />
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

      {announcementsPlaylists.length > 0 && (
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
                canEdit={canEditPlaylist(playlist)}
                canDelete={false}
              />
            ))}
          </div>
        </section>
      )}

      {role !== 'editor_alumne' && globalPlaylists.length > 0 && (
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
    </div>
  );
}

export type { PlaylistListProps, DefaultPlaylistMode };
