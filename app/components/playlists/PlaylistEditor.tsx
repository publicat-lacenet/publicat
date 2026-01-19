'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import DraggableVideoItem, { PlaylistItem } from './DraggableVideoItem';
import AddVideosModal from './AddVideosModal';
import PlaylistFormModal from './PlaylistFormModal';
import { useAuth } from '@/utils/supabase/useAuth';

interface Playlist {
  id: string;
  name: string;
  kind: string;
  is_deletable: boolean;
  is_student_editable: boolean;
  center_id: string | null;
}

interface PlaylistEditorProps {
  playlistId: string;
}

const kindDescriptions: Record<string, string> = {
  weekday: 'Aquesta llista es reprodueix automàticament el dia corresponent',
  announcements: 'Aquesta llista conté vídeos de tipus Anunci',
  custom: 'Llista personalitzada del centre',
  global: 'Llista global compartida amb tots els centres',
  landing: 'Llista per a la pàgina principal',
};

export default function PlaylistEditor({ playlistId }: PlaylistEditorProps) {
  const router = useRouter();
  const { role, centerId } = useAuth();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddVideos, setShowAddVideos] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);

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

  const fetchPlaylistDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/playlists/${playlistId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error carregant la llista');
      }

      const data = await res.json();
      setPlaylist(data.playlist);
      setItems(data.items || []);
    } catch (err: any) {
      console.error('Error fetching playlist:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    fetchPlaylistDetails();
  }, [fetchPlaylistDetails]);

  // Determine if user can edit this playlist
  const canEdit = useCallback(() => {
    if (!playlist) return false;
    if (role === 'admin_global') return true;
    if (role === 'editor_profe' && playlist.center_id === centerId) return true;
    if (role === 'editor_alumne' && playlist.is_student_editable) return true;
    return false;
  }, [playlist, role, centerId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(item => item.id === active.id);
    const newIndex = items.findIndex(item => item.id === over.id);

    // Optimistically update local state
    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);

    // Save to backend
    await saveReorder(newItems);
  };

  const saveReorder = async (reorderedItems: PlaylistItem[]) => {
    setSaving(true);
    try {
      const itemsWithPositions = reorderedItems.map((item, index) => ({
        id: item.id,
        position: index,
      }));

      const res = await fetch(`/api/playlists/${playlistId}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsWithPositions }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error guardant l\'ordre');
      }
    } catch (err: any) {
      console.error('Error saving reorder:', err);
      // Revert on error
      fetchPlaylistDetails();
      alert('Error guardant l\'ordre: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveVideo = async (itemId: string, videoId: string) => {
    if (removeConfirm !== itemId) {
      setRemoveConfirm(itemId);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/videos/${videoId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error eliminant el vídeo');
      }

      // Update local state
      setItems(items.filter(item => item.id !== itemId));
      setRemoveConfirm(null);
    } catch (err: any) {
      console.error('Error removing video:', err);
      alert('Error eliminant el vídeo: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVideosAdded = () => {
    fetchPlaylistDetails();
    setShowAddVideos(false);
  };

  const handlePlaylistUpdated = () => {
    fetchPlaylistDetails();
    setShowEditModal(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 rounded-lg animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        <p className="font-medium">Error carregant la llista</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => router.push('/llistes')}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Tornar a les llistes
        </button>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-gray)]">Llista no trobada</p>
        <button
          onClick={() => router.push('/llistes')}
          className="mt-2 text-[var(--color-secondary)] underline hover:no-underline"
        >
          Tornar a les llistes
        </button>
      </div>
    );
  }

  const userCanEdit = canEdit();

  return (
    <div className="space-y-6">
      {/* Header with playlist info */}
      <div className="bg-white border border-[var(--color-border)] rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-[var(--color-dark)] font-[family-name:var(--font-montserrat)]">
                {playlist.name}
              </h1>
              {playlist.kind === 'custom' && userCanEdit && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="p-1.5 text-[var(--color-gray)] hover:text-[var(--color-dark)] hover:bg-gray-100 rounded-lg transition-colors"
                  title="Editar nom i configuració"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-[var(--color-gray)] text-sm">
              {kindDescriptions[playlist.kind] || ''}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {playlist.is_student_editable && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                  Editable per alumnes
                </span>
              )}
              {!userCanEdit && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                  Només lectura
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {userCanEdit && (
              <button
                onClick={() => setShowAddVideos(true)}
                className="px-4 py-2 bg-[var(--color-secondary)] hover:bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium transition-colors"
              >
                + Afegir vídeos
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info banner for announcements playlist */}
      {playlist.kind === 'announcements' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
          Aquesta llista només accepta vídeos de tipus Anunci
        </div>
      )}

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

      {/* Video list with drag & drop */}
      {items.length === 0 ? (
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-[var(--color-gray)] mb-4">
            Aquesta llista està buida
          </p>
          {userCanEdit && (
            <button
              onClick={() => setShowAddVideos(true)}
              className="px-4 py-2 bg-[var(--color-secondary)] hover:bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium transition-colors"
            >
              Afegir els primers vídeos
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Helper text */}
          {userCanEdit && (
            <p className="text-sm text-[var(--color-gray)]">
              Arrossega els vídeos per canviar l&apos;ordre de reproducció
            </p>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map(i => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={item.id} className="relative">
                    <DraggableVideoItem
                      item={item}
                      index={index}
                      onRemove={() => handleRemoveVideo(item.id, item.video.id)}
                      canEdit={userCanEdit}
                    />
                    {/* Remove confirmation overlay */}
                    {removeConfirm === item.id && (
                      <div className="absolute inset-0 bg-white/95 rounded-lg flex items-center justify-center">
                        <div className="text-center p-4">
                          <p className="text-sm text-[var(--color-dark)] mb-3">
                            Eliminar aquest vídeo de la llista?
                          </p>
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => setRemoveConfirm(null)}
                              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              Cancel·lar
                            </button>
                            <button
                              onClick={() =>
                                handleRemoveVideo(item.id, item.video.id)
                              }
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
            </SortableContext>
          </DndContext>

          {/* Summary */}
          <p className="text-sm text-[var(--color-gray)] text-center">
            {items.length} {items.length === 1 ? 'vídeo' : 'vídeos'} en aquesta
            llista
          </p>
        </>
      )}

      {/* Add videos modal */}
      <AddVideosModal
        isOpen={showAddVideos}
        onClose={() => setShowAddVideos(false)}
        playlistId={playlistId}
        playlistKind={playlist.kind}
        onVideosAdded={handleVideosAdded}
        existingVideoIds={items.map(item => item.video.id)}
      />

      {/* Edit playlist modal */}
      {playlist.kind === 'custom' && (
        <PlaylistFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={handlePlaylistUpdated}
          initialData={{
            id: playlist.id,
            name: playlist.name,
            is_student_editable: playlist.is_student_editable,
          }}
        />
      )}
    </div>
  );
}

export type { PlaylistEditorProps };
