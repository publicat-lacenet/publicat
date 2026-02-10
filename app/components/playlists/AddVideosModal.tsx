'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, X, Video } from 'lucide-react';
import Modal from '@/app/components/ui/Modal';
import FilterDrawer from '@/app/components/videos/FilterDrawer';
import { useVideoFilters } from '@/hooks/useVideoFilters';
import { useAuth } from '@/utils/supabase/useAuth';

interface Video {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  type: string;
  centers: {
    id: string;
    name: string;
  };
}

interface AddVideosModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistId: string;
  playlistKind: string;
  onVideosAdded: () => void;
  existingVideoIds: string[];
}

export default function AddVideosModal({
  isOpen,
  onClose,
  playlistId,
  playlistKind,
  onVideosAdded,
  existingVideoIds,
}: AddVideosModalProps) {
  const { centerId } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  const {
    selectedTagIds,
    selectedHashtagIds,
    selectedZoneId,
    selectedCenterId,
    activeFilterCount,
    setTagIds,
    setHashtagIds,
    setZoneId,
    setCenterId,
    clearAll: clearAdvancedFilters,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
  } = useVideoFilters();

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        status: 'published',
        includeShared: 'true',
        limit: '100',
      });

      if (search) {
        params.append('search', search);
      }

      // For announcements playlist, filter by type
      if (playlistKind === 'announcements') {
        params.append('type', 'announcement');
      }

      // Advanced filters
      if (selectedTagIds.length > 0) {
        params.append('tagIds', selectedTagIds.join(','));
      }
      if (selectedHashtagIds.length > 0) {
        params.append('hashtagIds', selectedHashtagIds.join(','));
      }
      if (selectedZoneId) {
        params.append('zoneId', selectedZoneId);
      }

      const res = await fetch(`/api/videos?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error carregant els vídeos');
      }

      const data = await res.json();
      // Filter out videos already in the playlist
      const existingSet = new Set(existingVideoIds);
      const availableVideos = (data.videos || []).filter(
        (v: Video) => !existingSet.has(v.id)
      );
      setVideos(availableVideos);
    } catch (err: any) {
      console.error('Error fetching videos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, playlistKind, existingVideoIds, selectedTagIds, selectedHashtagIds, selectedZoneId]);

  useEffect(() => {
    if (isOpen) {
      fetchVideos();
    }
  }, [isOpen, fetchVideos]);

  // Debounce search
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchVideos();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, isOpen, fetchVideos]);

  const handleToggleVideo = (videoId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId);
    } else {
      newSelected.add(videoId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === videos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(videos.map(v => v.id)));
    }
  };

  const handleAddVideos = async () => {
    if (selectedIds.size === 0) return;

    setAdding(true);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_ids: Array.from(selectedIds) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error afegint els vídeos');
      }

      setSelectedIds(new Set());
      onVideosAdded();
    } catch (err: any) {
      console.error('Error adding videos:', err);
      alert(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearch('');
    setError(null);
    clearAdvancedFilters();
    onClose();
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Afegir vídeos a la llista"
      footer={
        <div className="w-full flex items-center justify-between">
          <span className="text-sm text-[var(--color-gray)]">
            {selectedIds.size}{' '}
            {selectedIds.size === 1 ? 'vídeo seleccionat' : 'vídeos seleccionats'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-[var(--color-dark)] bg-[var(--color-light-bg)] hover:bg-gray-200 rounded-lg transition-colors"
              disabled={adding}
            >
              Cancel·lar
            </button>
            <button
              onClick={handleAddVideos}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-secondary)] hover:bg-[var(--color-primary)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={adding || selectedIds.size === 0}
            >
              {adding ? 'Afegint...' : `Afegir ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Info banner for announcements playlist */}
        {playlistKind === 'announcements' && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            Aquesta llista només accepta vídeos de tipus Anunci
          </div>
        )}

        {/* Search + Filter button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cerca per títol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] focus:border-transparent"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-gray)]" />
          </div>
          <div className="flex items-center flex-shrink-0">
            <button
              onClick={openDrawer}
              className={`px-3 py-2 border rounded-lg flex items-center gap-1.5 transition-colors text-sm
                         ${activeFilterCount > 0
                           ? 'border-[#FEDD2C] bg-yellow-50 text-[var(--color-dark)] rounded-r-none'
                           : 'border-[var(--color-border)] text-[var(--color-gray)] hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-[#F91248] rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAdvancedFilters}
                className="px-1.5 py-2 border border-l-0 border-[#FEDD2C] bg-yellow-50 rounded-lg rounded-l-none
                         text-[var(--color-gray)] hover:text-[#F91248] transition-colors"
                title="Netejar filtres"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-gray-100 rounded-lg animate-pulse"
              ></div>
            ))}
          </div>
        )}

        {/* No videos available */}
        {!loading && videos.length === 0 && (
          <div className="text-center py-8">
            <Video className="w-10 h-10 text-[var(--color-gray)] mx-auto mb-2" />
            <p className="text-[var(--color-gray)]">
              {search
                ? 'No s\'han trobat vídeos'
                : playlistKind === 'announcements'
                ? 'No hi ha vídeos de tipus Anunci disponibles'
                : 'Tots els vídeos ja estan a la llista'}
            </p>
          </div>
        )}

        {/* Video list */}
        {!loading && videos.length > 0 && (
          <>
            {/* Select all button */}
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={handleSelectAll}
                className="text-[var(--color-secondary)] hover:underline"
              >
                {selectedIds.size === videos.length
                  ? 'Deseleccionar tots'
                  : 'Seleccionar tots'}
              </button>
              <span className="text-[var(--color-gray)]">
                {videos.length} vídeos disponibles
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
              {videos.map((video) => (
                <label
                  key={video.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedIds.has(video.id)
                      ? 'border-[var(--color-secondary)] bg-blue-50'
                      : 'border-[var(--color-border)] hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(video.id)}
                    onChange={() => handleToggleVideo(video.id)}
                    className="w-4 h-4 text-[var(--color-secondary)] border-[var(--color-border)] rounded focus:ring-[var(--color-secondary)]"
                  />

                  {/* Thumbnail */}
                  <div className="w-16 h-10 flex-shrink-0 bg-[var(--color-light-bg)] rounded overflow-hidden">
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-5 h-5 text-[var(--color-gray)]" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--color-dark)] text-sm truncate">
                      {video.title}
                    </p>
                    <p className="text-xs text-[var(--color-gray)]">
                      {video.centers?.name || 'Centre desconegut'}
                      {video.duration_seconds &&
                        ` · ${formatDuration(video.duration_seconds)}`}
                    </p>
                  </div>

                  {/* Type badge */}
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                      video.type === 'announcement'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {video.type === 'announcement' ? 'Anunci' : 'Contingut'}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>

    {/* Drawer de filtres avançats */}
    <FilterDrawer
      isOpen={isDrawerOpen}
      onClose={closeDrawer}
      selectedTagIds={selectedTagIds}
      selectedHashtagIds={selectedHashtagIds}
      selectedZoneId={selectedZoneId}
      selectedCenterId={selectedCenterId}
      onTagsChange={setTagIds}
      onHashtagsChange={setHashtagIds}
      onZoneChange={setZoneId}
      onCenterChange={setCenterId}
      onClearAll={clearAdvancedFilters}
      centerId={centerId || null}
      hideCenterFilter={true}
    />
    </>
  );
}

export type { AddVideosModalProps };
