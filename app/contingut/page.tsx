'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminLayout from '@/app/components/layout/AdminLayout';
import PageHeader from '@/app/components/ui/PageHeader';
import VideoGrid from '@/app/components/videos/VideoGrid';
import VideoFormModal from '@/app/components/videos/VideoFormModal';
import VideoPreviewModal from '@/app/components/videos/VideoPreviewModal';
import { Video } from '@/app/components/videos/VideoCard';
import { useVideos } from '@/hooks/useVideos';
import { useAuth } from '@/utils/supabase/useAuth';

export default function ContingutPage() {
  return (
    <Suspense fallback={<div>Carregant...</div>}>
      <ContingutContent />
    </Suspense>
  );
}

function ContingutContent() {
  const { role, centerId, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [includeShared, setIncludeShared] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'content' | 'announcement'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'pending'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);

  // Llegir paràmetre status de la URL
  useEffect(() => {
    const statusParam = searchParams?.get('status');
    if (statusParam === 'pending') {
      setStatusFilter('pending');
    }
  }, [searchParams]);

  // Solo habilitar useVideos cuando tengamos centerId (evita llamadas prematuras)
  const shouldFetchVideos = !authLoading && !!centerId;

  const { videos, loading, total, totalPages, refetch } = useVideos({
    filters: {
      search,
      centerId: centerId || null,
      zoneId: null,
      type: typeFilter,
      status: statusFilter,
      tagIds: [],
      hashtagIds: [],
      includeShared,
    },
    page,
    limit: 24,
    enabled: shouldFetchVideos,
  });

  // Admins globals i editors poden crear/editar vídeos
  const canEdit = role === 'editor_profe' || role === 'editor_alumne' || role === 'admin_global';

  // Mostrar loading mentre es carga la autenticació
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

  // Si no hi ha centerId després de carregar, mostrar error
  if (!centerId) {
    return (
      <AdminLayout>
        <PageHeader title="Contingut" description="Gestió de vídeos del centre" />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-gray-600 mb-2">No tens un centre associat</div>
            <div className="text-sm text-gray-500">Contacta amb l'administrador del sistema</div>
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

        // Emitir evento para actualizar el contador del sidebar (por si era pendiente)
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

    // Emitir evento para actualizar el contador del sidebar
    // (útil cuando un alumno sube un vídeo que queda pendiente)
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

        // Emitir evento para actualizar el contador del sidebar
        window.dispatchEvent(new CustomEvent('videoStatusChanged'));
      } else {
        const data = await res.json();
        alert(data.error || 'Error aprovant el vídeo');
      }
    } catch {
      alert('Error de connexió');
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Contingut"
        description="Gestió de vídeos del centre"
      />

      {/* Filtres bàsics */}
      <div className="mb-6 bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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

          {/* Estat (només per editor_profe - admin_global no gestiona pendents) */}
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
        onDelete={canEdit ? handleDelete : undefined}
        onPreview={setPreviewVideo}
        onApprove={role === 'editor_profe' ? handleApprove : undefined}
        showActions={canEdit}
        userCenterId={centerId}
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

      {/* Modal de creació/edició */}
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
      />
    </AdminLayout>
  );
}
