import AdminLayout from '@/app/components/layout/AdminLayout';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import PageHeader from '@/app/components/ui/PageHeader';

export default function UsuarisPage() {
  return (
    <AdminLayout>
      <Breadcrumb items={['Usuaris']} />
      
      <PageHeader
        title="Gestió d'Usuaris"
        description="Administració d'usuaris del centre: professors, alumnes i convidats"
      />

      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="text-6xl mb-6">👥</div>
          <h3 className="text-2xl font-bold text-[var(--color-dark)] font-[family-name:var(--font-montserrat)]">
            Gestió d&apos;Usuaris en Desenvolupament
          </h3>
          <p className="text-[var(--color-gray)] font-[family-name:var(--font-inter)]">
            Aquesta pàgina s&apos;implementarà al <strong>Milestone M3</strong>.
          </p>
          <p className="text-sm text-[var(--color-gray)] mt-6">
            Permetrà invitar usuaris per email amb rols específics (editor_profe, editor_alumne),
            gestionar permisos, assignar pantalles i veure activitat d&apos;usuaris.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
