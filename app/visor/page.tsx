import AdminLayout from '@/app/components/layout/AdminLayout';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import PageHeader from '@/app/components/ui/PageHeader';

export default function VisorPage() {
  return (
    <AdminLayout>
      <Breadcrumb items={['Visor']} />
      
      <PageHeader
        title="Visor"
        description="Reproducció de llistes, anuncis i feeds RSS del centre"
      />

      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="text-6xl mb-6">📺</div>
          <h3 className="text-2xl font-bold text-[var(--color-dark)] font-[family-name:var(--font-montserrat)]">
            Visor en Desenvolupament
          </h3>
          <p className="text-[var(--color-gray)] font-[family-name:var(--font-inter)]">
            Aquesta pàgina s&apos;implementarà al <strong>Milestone M6</strong>.
          </p>
          <p className="text-sm text-[var(--color-gray)] mt-6">
            El Visor permetrà visualitzar les llistes de reproducció, anuncis del centre i feeds RSS
            en temps real amb transicions automàtiques.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
