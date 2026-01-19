'use client';

import { use } from 'react';
import Link from 'next/link';
import AdminLayout from '@/app/components/layout/AdminLayout';
import PlaylistEditor from '@/app/components/playlists/PlaylistEditor';

interface EditarLlistaPageProps {
  params: Promise<{ id: string }>;
}

export default function EditarLlistaPage({ params }: EditarLlistaPageProps) {
  const { id } = use(params);

  return (
    <AdminLayout>
      <div className="mb-4">
        <Link
          href="/llistes"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-gray)] hover:text-[var(--color-dark)] transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Tornar a les llistes
        </Link>
      </div>

      <PlaylistEditor playlistId={id} />
    </AdminLayout>
  );
}
