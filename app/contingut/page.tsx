'use client';

import { useState } from 'react';
import AdminLayout from '@/app/components/layout/AdminLayout';
import PageHeader from '@/app/components/ui/PageHeader';
import VideoGrid from '@/app/components/videos/VideoGrid';
import VideoFormModal from '@/app/components/videos/VideoFormModal';
import { Video } from '@/app/components/videos/VideoCard';
import { useVideos } from '@/hooks/useVideos';
import { useAuth } from '@/utils/supabase/useAuth';

export default function ContingutPage() {
  const { role, centerId, loading: authLoading } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [includeShared, setIncludeShared] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'content' | 'announcement'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Solo habilitar useVideos cuando tengamos centerId (evita llamadas prematuras)
  const shouldFetchVideos = !authLoading && !!centerId;

  const { videos, loading, total, totalPages, refetch } = useVideos({
    filters: {
      search,
      centerId: centerId || null,
      zoneId: null,
      type: typeFilter,
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
    alert(`Editar vídeo: ${video.title}\n(Funcionalitat en desenvolupament)`);
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
      } else {
        const data = await res.json();
        alert(data.error || 'Error eliminant el vídeo');
      }
    } catch {
      alert('Error de connexió');
    }
  };

  const handleCreateVideo = () => {
    setIsModalOpen(true);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Contingut"
        description="Gestió de vídeos del centre"
      />

      {/* Filtres bàsics */}
      <div className="mb-6 bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
        showActions={canEdit}
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

      {/* Modal de creación */}
      <VideoFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refetch}
      />
    </AdminLayout>
  );
}
