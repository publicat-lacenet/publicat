'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/utils/supabase/useAuth';
import AdminLayout from '@/app/components/layout/AdminLayout';
import VisorPreview from './VisorPreview';

export default function VisorPage() {
  const router = useRouter();
  const { role, centerId, loading } = useAuth();

  // Check permissions - editor_profe, editor_alumne and admin_global can access
  useEffect(() => {
    if (!loading && role !== 'editor_profe' && role !== 'editor_alumne' && role !== 'admin_global') {
      router.push('/dashboard');
    }
  }, [role, loading, router]);

  if (loading) {
    return (
      <AdminLayout noPadding>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Carregant...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!centerId) {
    return (
      <AdminLayout noPadding>
        <div className="flex items-center justify-center h-full">
          <div className="text-red-500">No s&apos;ha pogut determinar el centre</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout noPadding>
      <VisorPreview centerId={centerId} />
    </AdminLayout>
  );
}
