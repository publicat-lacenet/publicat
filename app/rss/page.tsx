'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import AdminLayout from '@/app/components/layout/AdminLayout';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import PageHeader from '@/app/components/ui/PageHeader';
import RSSFeedList from '@/app/components/rss/RSSFeedList';
import RSSFeedFormModal from '@/app/components/rss/RSSFeedFormModal';
import RSSConfigForm from '@/app/components/rss/RSSConfigForm';
import RSSRotationOrder from '@/app/components/rss/RSSRotationOrder';
import { useAuth } from '@/utils/supabase/useAuth';
import type { RSSFeed } from '@/app/components/rss/RSSFeedCard';

type TabType = 'feeds' | 'config' | 'rotation';

export default function RSSPage() {
  const router = useRouter();
  const { role, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('feeds');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingFeed, setEditingFeed] = useState<RSSFeed | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const canManageRSS = role === 'editor_profe' || role === 'admin_global';

  const handleFeedCreated = useCallback(() => {
    setShowFormModal(false);
    setEditingFeed(null);
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleEdit = useCallback((feed: RSSFeed) => {
    setEditingFeed(feed);
    setShowFormModal(true);
  }, []);

  const handleDelete = useCallback(async (feedId: string) => {
    try {
      const res = await fetch(`/api/rss/${feedId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error eliminant el feed');
      }

      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      console.error('Error deleting feed:', err);
      alert('Error: ' + err.message);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowFormModal(false);
    setEditingFeed(null);
  }, []);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AdminLayout>
    );
  }

  // Redirect if user doesn't have permission
  if (!canManageRSS) {
    return (
      <AdminLayout>
        <Breadcrumb items={['RSS']} />
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <Lock className="w-10 h-10 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">
            Accés restringit
          </h2>
          <p className="text-yellow-700">
            Només els editors i administradors poden gestionar els feeds RSS.
          </p>
          <button
            onClick={() => router.push('/contingut')}
            className="mt-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
          >
            Tornar al contingut
          </button>
        </div>
      </AdminLayout>
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'feeds', label: 'Feeds' },
    { id: 'config', label: 'Configuració' },
    { id: 'rotation', label: 'Ordre de Rotació' },
  ];

  return (
    <AdminLayout>
      <Breadcrumb items={['RSS']} />

      <PageHeader
        title="Feeds RSS"
        description="Gestiona els feeds de notícies externes per mostrar a les pantalles"
        action={
          activeTab === 'feeds' ? (
            <button
              onClick={() => {
                setEditingFeed(null);
                setShowFormModal(true);
              }}
              className="px-4 py-2 bg-[var(--color-secondary)] hover:bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium transition-colors"
            >
              + Afegir Feed
            </button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-[var(--color-border)]">
          <nav className="flex gap-4" aria-label="Tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[var(--color-secondary)] text-[var(--color-secondary)]'
                    : 'border-transparent text-[var(--color-gray)] hover:text-[var(--color-dark)] hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'feeds' && (
        <RSSFeedList
          key={refreshKey}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreateClick={() => {
            setEditingFeed(null);
            setShowFormModal(true);
          }}
          refreshKey={refreshKey}
        />
      )}

      {activeTab === 'config' && <RSSConfigForm refreshKey={refreshKey} />}

      {activeTab === 'rotation' && <RSSRotationOrder refreshKey={refreshKey} />}

      {/* Form Modal */}
      <RSSFeedFormModal
        isOpen={showFormModal}
        onClose={handleCloseModal}
        onSuccess={handleFeedCreated}
        initialData={editingFeed}
      />
    </AdminLayout>
  );
}
