import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--color-light-bg)]">
      <AppHeader />
      <AppSidebar />
      
      {/* Main content area */}
      <main className="ml-[70px] mt-[60px] p-8">
        <div className="max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
