'use client';

import { useState } from 'react';
import AdminLayout from '@/app/components/layout/AdminLayout';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import PageHeader from '@/app/components/ui/PageHeader';
import PlaylistList from '@/app/components/playlists/PlaylistList';
import PlaylistFormModal from '@/app/components/playlists/PlaylistFormModal';
import { useAuth } from '@/utils/supabase/useAuth';

export default function LlistesPage() {
  const { role } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const canCreatePlaylist = role === 'editor_profe' || role === 'admin_global';

  const handlePlaylistCreated = () => {
    setShowCreateModal(false);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <AdminLayout>
      <Breadcrumb items={['Llistes']} />

      <PageHeader
        title="Llistes de Reproducció"
        description="Organitza els teus vídeos en llistes per als dies de la setmana, anuncis i llistes personalitzades"
        action={
          canCreatePlaylist ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[var(--color-secondary)] hover:bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium transition-colors"
            >
              + Nova Llista
            </button>
          ) : undefined
        }
      />

      <PlaylistList
        key={refreshKey}
        onCreatePlaylist={() => setShowCreateModal(true)}
      />

      <PlaylistFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handlePlaylistCreated}
      />
    </AdminLayout>
  );
}
