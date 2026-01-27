import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  /** Remove padding and max-width constraints for fullscreen content */
  noPadding?: boolean;
}

export default function AdminLayout({ children, noPadding = false }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--color-light-bg)]">
      <AppHeader />
      <AppSidebar />

      {/* Main content area */}
      {noPadding ? (
        <main className="ml-[70px] mt-[60px] h-[calc(100vh-60px)]">
          {children}
        </main>
      ) : (
        <main className="ml-[70px] mt-[60px] p-8">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      )}
    </div>
  );
}
