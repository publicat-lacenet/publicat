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
  { id: 'dashboard', icon: '🏠', label: 'Dashboard', href: '/dashboard' },
  { id: 'contingut', icon: '📹', label: 'Contingut', href: '/contingut', roles: ['editor_profe', 'editor_alumne'] },
  { id: 'llistes', icon: '📋', label: 'Llistes', href: '/llistes', roles: ['editor_profe', 'editor_alumne'] },
  { id: 'rss', icon: '📡', label: 'RSS', href: '/rss', roles: ['editor_profe'] },
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
    <aside className="w-[70px] bg-white border-r border-[var(--color-border)] fixed left-0 top-[60px] bottom-0 z-40">
      <nav className="flex flex-col h-full">
        {/* Main navigation items */}
        <div className="flex-1 flex flex-col gap-2 p-2">
          {visibleItems.slice(0, -1).map((item) => (
            <Link
              key={item.id}
              href={item.href}
              title={item.label}
              className={`
                relative h-12 flex items-center justify-center rounded-lg
                transition-all duration-200
                ${isActive(item.href)
                  ? 'bg-[var(--color-primary)] text-[var(--color-dark)] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[var(--color-accent)] before:rounded-r'
                  : 'text-[var(--color-gray)] hover:bg-[rgba(22,175,170,0.1)]'
                }
              `}
            >
              <span className="text-2xl">{item.icon}</span>
            </Link>
          ))}
        </div>

        {/* Profile at bottom */}
        <div className="p-2 border-t border-[var(--color-border)]">
          <Link
            href="/perfil"
            title="Perfil"
            className={`
              h-12 flex items-center justify-center rounded-lg
              transition-all duration-200
              ${pathname === '/perfil'
                ? 'bg-[var(--color-primary)] text-[var(--color-dark)]'
                : 'text-[var(--color-gray)] hover:bg-[rgba(22,175,170,0.1)]'
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
