import AdminLayout from '@/app/components/layout/AdminLayout';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import PageHeader from '@/app/components/ui/PageHeader';

export default function RSSPage() {
  return (
    <AdminLayout>
      <Breadcrumb items={['RSS']} />
      
      <PageHeader
        title="Feeds RSS"
        description="Gestió de fonts RSS externes per mostrar notícies i anuncis"
      />

      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="text-6xl mb-6">📡</div>
          <h3 className="text-2xl font-bold text-[var(--color-dark)] font-[family-name:var(--font-montserrat)]">
            Gestió RSS en Desenvolupament
          </h3>
          <p className="text-[var(--color-gray)] font-[family-name:var(--font-inter)]">
            Aquesta pàgina s&apos;implementarà al <strong>Milestone M5</strong>.
          </p>
          <p className="text-sm text-[var(--color-gray)] mt-6">
            Permetrà afegir feeds RSS externs, configurar freqüència d&apos;actualització,
            filtrar contingut per paraules clau i integrar-los al visor de pantalles.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
