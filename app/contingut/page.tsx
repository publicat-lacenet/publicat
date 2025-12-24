import AdminLayout from '@/app/components/layout/AdminLayout';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import PageHeader from '@/app/components/ui/PageHeader';

export default function ContingutPage() {
  return (
    <AdminLayout>
      <Breadcrumb items={['Contingut']} />
      
      <PageHeader
        title="Contingut"
        description="Gestió de vídeos del centre: pujar, editar, moderar i organitzar"
      />

      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="text-6xl mb-6">📹</div>
          <h3 className="text-2xl font-bold text-[var(--color-dark)] font-[family-name:var(--font-montserrat)]">
            Gestió de Contingut en Desenvolupament
          </h3>
          <p className="text-[var(--color-gray)] font-[family-name:var(--font-inter)]">
            Aquesta pàgina s&apos;implementarà al <strong>Milestone M3</strong>.
          </p>
          <p className="text-sm text-[var(--color-gray)] mt-6">
            Permetrà pujar vídeos a Vimeo, gestionar metadades (títol, descripció, tags, hashtags),
            sistema de moderació amb 3 estats, i cerca/filtre avançat.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
