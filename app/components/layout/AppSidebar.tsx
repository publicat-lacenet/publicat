'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/utils/supabase/useAuth';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Badge } from '@/app/components/ui/badge';
import { Monitor, Video, ListVideo, Rss, Users, Settings, User, type LucideIcon } from 'lucide-react';

interface SidebarItem {
  id: string;
  icon: LucideIcon;
  label: string;
  href: string;
  roles?: string[]; // Rols que poden veure aquest item
  showBadge?: boolean; // Mostrar badge de comptador
}

const sidebarItems: SidebarItem[] = [
  { id: 'contingut', icon: Video, label: 'Contingut', href: '/contingut', roles: ['editor_profe', 'editor_alumne', 'admin_global'], showBadge: true },
  { id: 'llistes', icon: ListVideo, label: 'Llistes', href: '/llistes', roles: ['editor_profe', 'editor_alumne', 'admin_global'] },
  { id: 'visor', icon: Monitor, label: 'Visor', href: '/pantalla/config' },
  { id: 'rss', icon: Rss, label: 'RSS', href: '/rss', roles: ['editor_profe', 'admin_global'] },
  { id: 'usuaris', icon: Users, label: 'Usuaris', href: '/usuaris', roles: ['editor_profe', 'admin_global'] },
  { id: 'admin', icon: Settings, label: 'Administració', href: '/admin', roles: ['admin_global'] },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { role, loading, centerId } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const supabase = createClient();

  // Fetch pending videos count NOMÉS per editor_profe
  // L'admin_global NO gestiona vídeos pendents de centres
  useEffect(() => {
    if (!role || role !== 'editor_profe') {
      setPendingCount(0);
      return;
    }

    const fetchPendingCount = async () => {
      try {
        let query = supabase
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending_approval');

        // Filtrar per centre (tant per editor_profe com per admin_global)
        if (centerId) {
          query = query.eq('center_id', centerId);
        }

        const { count, error } = await query;

        if (!error) {
          setPendingCount(count || 0);
        }
      } catch (err) {
        console.error('Error fetching pending count:', err);
      }
    };

    fetchPendingCount();

    // Realtime subscription per actualitzar el comptador
    const channel = supabase
      .channel('pending_videos_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'videos',
          filter: centerId ? `center_id=eq.${centerId}` : undefined
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    // Escuchar eventos manuales de aprobación/rechazo de vídeos
    const handleVideoStatusChange = () => {
      fetchPendingCount();
    };

    window.addEventListener('videoStatusChanged', handleVideoStatusChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('videoStatusChanged', handleVideoStatusChange);
    };
  }, [role, centerId, supabase]);

  if (loading) {
    return (
      <aside className="w-[70px] bg-gradient-to-b from-[#FEDD2C] to-[#FFF7CF] border-r border-[#E5E7EB] fixed left-0 top-[60px] bottom-0 z-40 shadow-sm">
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-gray-500">...</div>
        </div>
      </aside>
    );
  }

  const visibleItems = sidebarItems.filter(item =>
    !item.roles || (role && item.roles.includes(role))
  );

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <aside className="w-[70px] bg-gradient-to-b from-[#FEDD2C] to-[#FFF7CF] border-r border-[#E5E7EB] fixed left-0 top-[60px] bottom-0 z-40 shadow-sm">
      <nav className="flex flex-col h-full">
        {/* Main navigation items */}
        <div className="flex-1 flex flex-col gap-1 p-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`
                  group relative h-12 flex items-center justify-center rounded-lg
                  transition-all duration-200
                  ${active
                    ? 'bg-white/80 shadow-md before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[var(--color-accent)] before:rounded-r'
                    : 'hover:bg-white/50'
                  }
                `}
              >
                <Icon className={`w-5 h-5 transition-colors duration-200 ${active ? 'text-[var(--color-accent)]' : 'text-[var(--color-dark)] group-hover:text-[var(--color-accent)]'}`} />
                {/* Badge de comptador per vídeos pendents (NOMÉS per editor_profe) */}
                {item.showBadge && pendingCount > 0 && role === 'editor_profe' && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-600">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </Badge>
                )}
                {/* Tooltip */}
                <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Profile at bottom */}
        <div className="p-2 border-t border-[#E5E7EB]/50">
          <Link
            href="/perfil"
            className={`
              group relative h-12 flex items-center justify-center rounded-lg
              transition-all duration-200
              ${pathname === '/perfil'
                ? 'bg-white/80 shadow-md'
                : 'hover:bg-white/50'
              }
            `}
          >
            <User className={`w-5 h-5 transition-colors duration-200 ${pathname === '/perfil' ? 'text-[var(--color-accent)]' : 'text-[var(--color-dark)] group-hover:text-[var(--color-accent)]'}`} />
            {/* Tooltip */}
            <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              Perfil
            </span>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
