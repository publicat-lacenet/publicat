'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminLayout from '@/app/components/layout/AdminLayout';
import PageHeader from '@/app/components/ui/PageHeader';
import VideoGrid from '@/app/components/videos/VideoGrid';
import VideoFormModal from '@/app/components/videos/VideoFormModal';
import VideoPreviewModal from '@/app/components/videos/VideoPreviewModal';
import RejectionCommentModal from '@/app/components/videos/RejectionCommentModal';
import FilterDrawer from '@/app/components/videos/FilterDrawer';
import { Video } from '@/app/components/videos/VideoCard';
import { useVideos } from '@/hooks/useVideos';
import { useVideoFilters } from '@/hooks/useVideoFilters';
import { useAuth } from '@/utils/supabase/useAuth';
import { MessageSquareWarning } from 'lucide-react';

export default function ContingutPage() {
  return (
    <Suspense fallback={<div>Carregant...</div>}>
      <ContingutContent />
    </Suspense>
  );
}

function ContingutContent() {
  const { user, role, centerId, loading: authLoading } = useAuth();
  const userId = user?.id;
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [includeShared, setIncludeShared] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'content' | 'announcement'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'pending'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  // Estat per al modal de revisió
  const [revisionVideo, setRevisionVideo] = useState<Video | null>(null);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

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

  // Llegir paràmetre status de la URL
  useEffect(() => {
    const statusParam = searchParams?.get('status');
    if (statusParam === 'pending') {
      setStatusFilter('pending');
    }
  }, [searchParams]);

  const shouldFetchVideos = !authLoading && !!centerId;

  const filterCenterId = selectedCenterId || centerId || null;
  const filterIncludeShared = selectedCenterId ? false : includeShared;

  const { videos, loading, total, totalPages, refetch } = useVideos({
    filters: {
      search,
      centerId: filterCenterId,
      zoneId: selectedZoneId,
      type: typeFilter,
      status: statusFilter,
      tagIds: selectedTagIds,
      hashtagIds: selectedHashtagIds,
      includeShared: filterIncludeShared,
    },
    page,
    limit: 24,
    enabled: shouldFetchVideos,
  });

  const canEdit = role === 'editor_profe' || role === 'editor_alumne' || role === 'admin_global';

  // Vídeos en revisió propis (per al banner de l'alumne)
  const revisionVideos = role === 'editor_alumne'
    ? videos.filter(v => v.status === 'needs_revision' && v.uploaded_by_user_id === userId)
    : [];

  if (authLoading) {
    return (
      <AdminLayout>
        <PageHeader title="Contingut" description="Gestió de vídeos del centre" />
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Carregant contingut...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!centerId) {
    return (
      <AdminLayout>
        <PageHeader title="Contingut" description="Gestió de vídeos del centre" />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-gray-600 mb-2">No tens un centre associat</div>
            <div className="text-sm text-gray-500">Contacta amb l&apos;administrador del sistema</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const handleEdit = (video: Video) => {
    setEditingVideo(video);
    setIsModalOpen(true);
  };

  const handleDelete = async (video: Video) => {
    if (!confirm(`Segur que vols eliminar "${video.title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/videos/${video.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Vídeo eliminat correctament');
        refetch();
        if (video.status === 'pending_approval') {
          window.dispatchEvent(new CustomEvent('videoStatusChanged'));
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Error eliminant el vídeo');
      }
    } catch {
      alert('Error de connexió');
    }
  };

  const handleCreateVideo = () => {
    setEditingVideo(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingVideo(null);
  };

  const handleModalSuccess = () => {
    refetch();
    window.dispatchEvent(new CustomEvent('videoStatusChanged'));
  };

  const handleApprove = async (video: Video) => {
    if (!confirm(`Aprovar el vídeo "${video.title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/videos/${video.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      });

      if (res.ok) {
        alert('Vídeo aprovat correctament');
        refetch();
        window.dispatchEvent(new CustomEvent('videoStatusChanged'));
      } else {
        const data = await res.json();
        alert(data.error || 'Error aprovant el vídeo');
      }
    } catch {
      alert('Error de connexió');
    }
  };

  // Obrir modal de sol·licitud de revisió
  const handleRequestRevision = (video: Video) => {
    setRevisionVideo(video);
    setIsRevisionModalOpen(true);
  };

  // Confirmar la sol·licitud de revisió amb el comentari
  const handleRevisionConfirm = async (comment: string) => {
    if (!revisionVideo) return;
    setIsSubmittingRevision(true);

    try {
      const res = await fetch(`/api/videos/${revisionVideo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_revision',
          rejection_comment: comment,
        }),
      });

      if (res.ok) {
        alert(`S'ha notificat a l'alumne que el vídeo "${revisionVideo.title}" necessita revisió.`);
        setIsRevisionModalOpen(false);
        setRevisionVideo(null);
        refetch();
        window.dispatchEvent(new CustomEvent('videoStatusChanged'));
      } else {
        const data = await res.json();
        alert(data.error || 'Error sol·licitant revisió');
      }
    } catch {
      alert('Error de connexió');
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  // Handler de "Demanar revisió" des del VideoPreviewModal (rep videoId)
  const handleRequestRevisionById = (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    if (video) handleRequestRevision(video);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Contingut"
        description="Gestió de vídeos del centre"
      />

      {/* Banner d'avís per a editor_alumne amb vídeos en revisió */}
      {role === 'editor_alumne' && revisionVideos.length > 0 && !loading && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <MessageSquareWarning className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 font-[family-name:var(--font-montserrat)]">
              {revisionVideos.length === 1
                ? 'Tens 1 vídeo que necessita revisió'
                : `Tens ${revisionVideos.length} vídeos que necessiten revisió`}
            </p>
            <p className="text-sm text-red-600 mt-0.5 font-[family-name:var(--font-inter)]">
              El professor ha deixat comentaris. Fes clic a &ldquo;Corregir&rdquo; al vídeo corresponent per veure el feedback i enviar els canvis.
            </p>
          </div>
        </div>
      )}

      {/* Filtres bàsics */}
      <div className="mb-6 bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          {/* Cerca */}
          <input
            type="text"
            placeholder="Cerca per títol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg
                     focus:outline-none focus:border-[var(--color-secondary)]
                     font-[family-name:var(--font-inter)]"
          />

          {/* Tipus */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'content' | 'announcement')}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg
                     focus:outline-none focus:border-[var(--color-secondary)]
                     font-[family-name:var(--font-inter)]"
          >
            <option value="all">Tots els tipus</option>
            <option value="content">Només contingut</option>
            <option value="announcement">Només anuncis</option>
          </select>

          {/* Estat (només per editor_profe) */}
          {role === 'editor_profe' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'pending')}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg
                       focus:outline-none focus:border-[var(--color-secondary)]
                       font-[family-name:var(--font-inter)]"
            >
              <option value="all">Tots els estats</option>
              <option value="published">Publicats</option>
              <option value="pending">Pendents d&apos;aprovació</option>
            </select>
          )}

          {/* Botó filtres avançats */}
          <div className="flex items-center gap-1">
            <button
              onClick={openDrawer}
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors
                         font-medium font-[family-name:var(--font-inter)]
                         ${activeFilterCount > 0
                           ? 'border-[#FEDD2C] bg-yellow-50 text-[var(--color-dark)] rounded-r-none'
                           : 'border-[var(--color-border)] text-[var(--color-dark)] hover:bg-gray-50'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              Filtres
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-[#F91248] rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { clearAdvancedFilters(); setPage(1); }}
                className="px-2 py-2 border border-l-0 border-[#FEDD2C] bg-yellow-50 rounded-lg rounded-l-none
                         text-[var(--color-gray)] hover:text-[#F91248] transition-colors"
                title="Netejar filtres"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          {/* Botó crear */}
          {canEdit && (
            <button
              onClick={handleCreateVideo}
              className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg
                       hover:bg-[var(--color-secondary)] transition-colors
                       font-medium font-[family-name:var(--font-inter)]"
            >
              + Pujar Vídeo
            </button>
          )}
        </div>

        {/* Checkbox compartits */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="includeShared"
            checked={includeShared}
            onChange={(e) => setIncludeShared(e.target.checked)}
            className="w-4 h-4 text-[var(--color-secondary)] border-[var(--color-border)] rounded
                     focus:ring-[var(--color-secondary)]"
          />
          <label
            htmlFor="includeShared"
            className="text-sm text-[var(--color-dark)] cursor-pointer font-[family-name:var(--font-inter)]"
          >
            Incloure vídeos compartits d&apos;altres centres
          </label>
        </div>
      </div>

      {/* Grid de vídeos */}
      <VideoGrid
        videos={videos}
        loading={loading}
        onEdit={canEdit ? handleEdit : undefined}
        onDelete={canEdit && role !== 'editor_alumne' ? handleDelete : undefined}
        onPreview={setPreviewVideo}
        onApprove={role === 'editor_profe' ? handleApprove : undefined}
        onRequestRevision={role === 'editor_profe' ? handleRequestRevision : undefined}
        showActions={canEdit}
        userCenterId={centerId}
        userRole={role ?? undefined}
        userId={userId ?? undefined}
      />

      {/* Paginació */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg
                     hover:bg-[var(--color-light-bg)] disabled:opacity-50
                     disabled:cursor-not-allowed font-[family-name:var(--font-inter)]"
          >
            ← Anterior
          </button>

          <span className="px-4 py-2 font-[family-name:var(--font-inter)]">
            Pàgina {page} de {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg
                     hover:bg-[var(--color-light-bg)] disabled:opacity-50
                     disabled:cursor-not-allowed font-[family-name:var(--font-inter)]"
          >
            Següent →
          </button>
        </div>
      )}

      {/* Info total */}
      {!loading && (
        <div className="mt-4 text-center text-sm text-[var(--color-gray)] font-[family-name:var(--font-inter)]">
          Mostrant {videos.length} de {total} vídeos
        </div>
      )}

      {/* Modal de creació/edició/revisió */}
      <VideoFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editVideo={editingVideo}
      />

      {/* Modal de previsualització */}
      <VideoPreviewModal
        video={previewVideo}
        isOpen={!!previewVideo}
        onClose={() => setPreviewVideo(null)}
        onApprove={role === 'editor_profe' ? (videoId) => {
          const video = videos.find(v => v.id === videoId);
          if (video) handleApprove(video);
        } : undefined}
        onReject={role === 'editor_profe' ? (videoId) => {
          const video = videos.find(v => v.id === videoId);
          if (video) handleDelete(video);
        } : undefined}
        onRequestRevision={role === 'editor_profe' ? handleRequestRevisionById : undefined}
        showModerationActions={
          role === 'editor_profe' &&
          previewVideo?.status === 'pending_approval' &&
          previewVideo?.centers?.id === centerId
        }
      />

      {/* Modal de sol·licitud de revisió */}
      <RejectionCommentModal
        isOpen={isRevisionModalOpen}
        videoTitle={revisionVideo?.title || ''}
        onConfirm={handleRevisionConfirm}
        onClose={() => {
          setIsRevisionModalOpen(false);
          setRevisionVideo(null);
        }}
        isSubmitting={isSubmittingRevision}
      />

      {/* Drawer de filtres avançats */}
      <FilterDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        selectedTagIds={selectedTagIds}
        selectedHashtagIds={selectedHashtagIds}
        selectedZoneId={selectedZoneId}
        selectedCenterId={selectedCenterId}
        onTagsChange={(ids) => { setTagIds(ids); setPage(1); }}
        onHashtagsChange={(ids) => { setHashtagIds(ids); setPage(1); }}
        onZoneChange={(id) => { setZoneId(id); setPage(1); }}
        onCenterChange={(id) => { setCenterId(id); setPage(1); }}
        onClearAll={() => { clearAdvancedFilters(); setPage(1); }}
        centerId={centerId}
      />
    </AdminLayout>
  );
}
