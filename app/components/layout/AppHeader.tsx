'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="h-[60px] bg-white border-b border-[var(--color-border)] fixed top-0 left-0 right-0 z-50">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="text-2xl font-bold font-[family-name:var(--font-montserrat)]">
            <span className="text-[var(--color-accent)]">PUBLI</span>
            <span className="text-[var(--color-dark)]">CAT</span>
          </div>
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

        {/* Right side: Notifications + User */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="relative p-2 hover:bg-[var(--color-light-bg)] rounded-lg transition-colors">
            <span className="text-xl">🔔</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-accent)] rounded-full"></span>
          </button>

          {/* User Dropdown */}
          <div className="flex items-center gap-2 pl-4 border-l border-[var(--color-border)]">
            <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-[var(--color-dark)] font-semibold">
              A
            </div>
            <span className="text-sm font-[family-name:var(--font-inter)] text-[var(--color-dark)]">
              Admin
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
