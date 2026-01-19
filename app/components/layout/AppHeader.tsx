'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/utils/supabase/useAuth';

const ROLE_LABELS: Record<string, string> = {
  admin_global: 'Admin Global',
  editor_profe: 'Editor Professor',
  editor_alumne: 'Editor Alumne',
  display: 'Display',
};

export default function AppHeader() {
  const { user, role, loading, error } = useAuth();

  // Mostrar el rol incluso mientras carga si ya está disponible
  const displayRole = error
    ? 'Error de sessió'
    : role
    ? (ROLE_LABELS[role] || role)
    : (loading ? 'Carregant...' : 'Sense rol');

  return (
    <>
      {/* Error banner */}
      {error && (
        <div className="fixed top-0 left-0 right-0 bg-red-50 border-b-2 border-red-300 px-6 py-2 z-[60] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-600 text-sm font-medium">⚠️ {error}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Refrescar
            </button>
            <form action="/auth/signout" method="post" className="inline">
              <button
                type="submit"
                className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Tancar sessió
              </button>
            </form>
          </div>
        </div>
      )}

      <header className={`h-[60px] bg-white border-b border-[var(--color-border)] fixed left-0 right-0 z-50 ${error ? 'top-[44px]' : 'top-0'}`}>
        <div className="h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/logo_videos.png"
            alt="Logo PUBLI*CAT"
            width={40}
            height={40}
          />
          <span className="text-xl font-semibold tracking-tight text-[#111827] font-[family-name:var(--font-montserrat)]">
            PUBLI*CAT
          </span>
        </Link>

        {/* Search Bar (placeholder) */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Cerca... (Cmd+K)"
              className="w-full px-4 py-2 pr-10 border border-[var(--color-border)] rounded-lg 
                         focus:outline-none focus:border-[var(--color-secondary)] 
                         font-[family-name:var(--font-inter)] text-sm"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-gray)]">
              🔍
            </div>
          </div>
        </div>

        {/* Right side: User + Logout */}
        <div className="flex items-center gap-4">
          {/* User Info */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-[var(--color-dark)] font-semibold">
              {user?.email?.[0].toUpperCase() || '?'}
            </div>
            <span 
              className="text-sm font-[family-name:var(--font-inter)] text-[var(--color-dark)]"
              suppressHydrationWarning
            >
              {displayRole}
            </span>
          </div>

          {/* Logout Button */}
          <form
            action="/auth/signout"
            method="post"
            onSubmit={() => {
              // Limpiar sessionStorage antes de enviar el formulario
              if (typeof window !== 'undefined') {
                sessionStorage.clear();
              }
            }}
          >
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-[#16AFAA] text-white rounded-full hover:bg-[#14998F] transition-colors font-[family-name:var(--font-inter)]"
            >
              Sortir
            </button>
          </form>
        </div>
      </div>
    </header>
    </>
  );
}
