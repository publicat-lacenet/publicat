'use client';

import { useState } from 'react';
import AdminLayout from '@/app/components/layout/AdminLayout';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import PageHeader from '@/app/components/ui/PageHeader';
import AdminTabs from '@/app/components/ui/AdminTabs';
import ZonesTab from './tabs/ZonesTab';

const tabs = [
  { id: 'centres', label: 'Centres', icon: '🏫' },
  { id: 'usuaris', label: 'Usuaris', icon: '👥' },
  { id: 'zones', label: 'Zones', icon: '🗺️' },
  { id: 'landing', label: 'LandingPlaylist', icon: '🎬' },
  { id: 'supervisio', label: 'Supervisió', icon: '📊' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('zones');

  return (
    <AdminLayout>
      <Breadcrumb items={['Home', 'Administració']} />
      
      <PageHeader
        title="Administració"
        description="Gestió global de centres, usuaris i zones del sistema"
      />

      <AdminTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div>
        {activeTab === 'centres' && (
          <div className="text-center py-12 text-[var(--color-gray)]">
            Tab Centres (pendent implementació)
          </div>
        )}
        {activeTab === 'usuaris' && (
          <div className="text-center py-12 text-[var(--color-gray)]">
            Tab Usuaris (pendent implementació)
          </div>
        )}
        {activeTab === 'zones' && <ZonesTab />}
        {activeTab === 'landing' && (
          <div className="text-center py-12 text-[var(--color-gray)]">
            Tab LandingPlaylist (pendent implementació)
          </div>
        )}
        {activeTab === 'supervisio' && (
          <div className="text-center py-12 text-[var(--color-gray)]">
            Tab Supervisió (pendent implementació)
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
