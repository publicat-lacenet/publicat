import AdminLayout from '@/app/components/layout/AdminLayout';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import PageHeader from '@/app/components/ui/PageHeader';

export default function PerfilPage() {
  return (
    <AdminLayout>
      <Breadcrumb items={['Perfil']} />
      
      <PageHeader
        title="El Meu Perfil"
        description="Gestiona la teva informació personal i preferències"
      />

      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="text-6xl mb-6">👤</div>
          <h3 className="text-2xl font-bold text-[var(--color-dark)] font-[family-name:var(--font-montserrat)]">
            Pàgina de Perfil en Desenvolupament
          </h3>
          <p className="text-[var(--color-gray)] font-[family-name:var(--font-inter)]">
            Aquesta pàgina s&apos;implementarà més endavant.
          </p>
          <p className="text-sm text-[var(--color-gray)] mt-6">
            Permetrà editar dades personals, canviar contrasenya, configurar notificacions
            i gestionar preferències d&apos;idioma i visualització.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
