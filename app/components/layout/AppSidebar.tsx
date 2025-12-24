'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarItem {
  id: string;
  icon: string;
  label: string;
  href: string;
  roles?: string[]; // Rols que poden veure aquest item
}

const sidebarItems: SidebarItem[] = [
  { id: 'visor', icon: '📺', label: 'Visor', href: '/visor' },
  { id: 'contingut', icon: '📹', label: 'Contingut', href: '/contingut', roles: ['editor_profe', 'editor_alumne', 'admin_global'] },
  { id: 'llistes', icon: '📋', label: 'Llistes', href: '/llistes', roles: ['editor_profe', 'editor_alumne', 'admin_global'] },
  { id: 'rss', icon: '📡', label: 'RSS', href: '/rss', roles: ['editor_profe', 'admin_global'] },
  { id: 'usuaris', icon: '👥', label: 'Usuaris', href: '/usuaris', roles: ['editor_profe', 'admin_global'] },
  { id: 'admin', icon: '⚙️', label: 'Administració', href: '/admin', roles: ['admin_global'] },
];

export default function AppSidebar() {
  const pathname = usePathname();

  // TODO: Get user role from auth context
  const userRole = 'admin_global'; // Hardcoded per ara

  const visibleItems = sidebarItems.filter(item => 
    !item.roles || item.roles.includes(userRole)
  );

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <aside className="w-[70px] bg-gradient-to-b from-[#FEDD2C] to-[#FFF7CF] border-r border-[#E5E7EB] fixed left-0 top-[60px] bottom-0 z-40 shadow-sm">
      <nav className="flex flex-col h-full">
        {/* Main navigation items */}
        <div className="flex-1 flex flex-col gap-2 p-2">
          {visibleItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              title={item.label}
              className={`
                relative h-12 flex items-center justify-center rounded-lg
                transition-all duration-200
                ${isActive(item.href)
                  ? 'bg-white/80 shadow-md before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[var(--color-accent)] before:rounded-r'
                  : 'hover:bg-white/50'
                }
              `}
            >
              <span className="text-2xl">{item.icon}</span>
            </Link>
          ))}
        </div>

        {/* Profile at bottom */}
        <div className="p-2 border-t border-[#E5E7EB]/50">
          <Link
            href="/perfil"
            title="Perfil"
            className={`
              h-12 flex items-center justify-center rounded-lg
              transition-all duration-200
              ${pathname === '/perfil'
                ? 'bg-white/80 shadow-md'
                : 'hover:bg-white/50'
              }
            `}
          >
            <span className="text-2xl">👤</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
