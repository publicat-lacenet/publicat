import AdminLayout from '@/app/components/layout/AdminLayout';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import PageHeader from '@/app/components/ui/PageHeader';

export default function LlistesPage() {
  return (
    <AdminLayout>
      <Breadcrumb items={['Llistes']} />
      
      <PageHeader
        title="Llistes de Reproducció"
        description="Creació i gestió de playlists de vídeos per a pantalles del centre"
      />

      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="text-6xl mb-6">📋</div>
          <h3 className="text-2xl font-bold text-[var(--color-dark)] font-[family-name:var(--font-montserrat)]">
            Gestió de Llistes en Desenvolupament
          </h3>
          <p className="text-[var(--color-gray)] font-[family-name:var(--font-inter)]">
            Aquesta pàgina s&apos;implementarà al <strong>Milestone M4</strong>.
          </p>
          <p className="text-sm text-[var(--color-gray)] mt-6">
            Permetrà crear playlists, afegir vídeos amb drag & drop, configurar durada i ordre,
            assignar llistes a pantalles específiques del centre.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
