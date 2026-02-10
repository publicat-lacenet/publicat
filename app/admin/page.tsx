'use client';

import { useState } from 'react';
import AdminLayout from '@/app/components/layout/AdminLayout';
import PageHeader from '@/app/components/ui/PageHeader';
import AdminTabs from '@/app/components/ui/AdminTabs';
import ZonesTab from './tabs/ZonesTab';
import CentresTab from './tabs/CentresTab';
import UsersTab from './tabs/UsersTab';
import { School, Users, MapPin, BarChart3 } from 'lucide-react';

const tabs = [
  { id: 'centres', label: 'Centres', icon: School },
  { id: 'usuaris', label: 'Usuaris', icon: Users },
  { id: 'zones', label: 'Zones', icon: MapPin },
  { id: 'supervisio', label: 'Supervisió', icon: BarChart3 },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('centres');

  return (
    <AdminLayout>
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
        {activeTab === 'centres' && <CentresTab />}
        {activeTab === 'usuaris' && <UsersTab />}
        {activeTab === 'zones' && <ZonesTab />}
        {activeTab === 'supervisio' && (
          <div className="text-center py-12 text-[var(--color-gray)]">
            Tab Supervisió (pendent implementació)
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
