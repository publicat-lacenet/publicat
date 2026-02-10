'use client';

import { Calendar, Megaphone, LayoutList, Globe, Home, Trash2, type LucideIcon } from 'lucide-react';

interface Playlist {
  id: string;
  name: string;
  kind: 'weekday' | 'announcements' | 'custom' | 'global' | 'landing';
  is_deletable: boolean;
  is_student_editable: boolean;
  video_count: number;
  center_id: string | null;
  origin_playlist_id: string | null;
  created_at: string;
  updated_at: string | null;
  centers?: {
    id: string;
    name: string;
  };
}

interface PlaylistCardProps {
  playlist: Playlist;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCopy?: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  isGlobal?: boolean;
}

const kindIcons: Record<string, LucideIcon> = {
  weekday: Calendar,
  announcements: Megaphone,
  custom: LayoutList,
  global: Globe,
  landing: Home,
};

const kindLabels: Record<string, string> = {
  weekday: 'Predefinida',
  announcements: 'Anuncis',
  custom: 'Personalitzada',
  global: 'Global',
  landing: 'Landing',
};

export default function PlaylistCard({
  playlist,
  onEdit,
  onDelete,
  onCopy,
  canEdit = true,
  canDelete = true,
  isGlobal = false,
}: PlaylistCardProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'avui';
    if (diffDays === 1) return 'fa 1 dia';
    if (diffDays < 7) return `fa ${diffDays} dies`;
    if (diffDays < 30) return `fa ${Math.floor(diffDays / 7)} setmanes`;
    return date.toLocaleDateString('ca-ES');
  };

  const Icon = kindIcons[playlist.kind] || LayoutList;
  const kindLabel = kindLabels[playlist.kind] || playlist.kind;
  const showDeleteButton = canDelete && playlist.is_deletable && onDelete;
  const showCopyButton = isGlobal && onCopy;

  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden transition-all duration-200 hover:border-[var(--color-secondary)] hover:shadow-lg">
      <div className="p-4">
        {/* Header with name and actions */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Icon className="w-6 h-6 text-[var(--color-secondary)]" />
            <h3 className="font-semibold text-[var(--color-dark)] font-[family-name:var(--font-montserrat)] line-clamp-1">
              {playlist.name}
            </h3>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Edit button */}
            {canEdit && onEdit && (
              <button
                onClick={() => onEdit(playlist.id)}
                className="px-3 py-1.5 text-sm font-medium text-[var(--color-dark)] hover:bg-[var(--color-secondary)] hover:text-white rounded-lg transition-colors"
                title="Editar llista"
              >
                Editar
              </button>
            )}

            {/* Delete button */}
            {showDeleteButton && (
              <button
                onClick={() => onDelete(playlist.id)}
                className="p-1.5 text-[var(--color-gray)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar llista"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            {/* Copy button for global playlists */}
            {showCopyButton && (
              <button
                onClick={() => onCopy(playlist.id)}
                className="px-3 py-1.5 text-sm font-medium bg-[var(--color-secondary)] text-white hover:bg-[var(--color-primary)] rounded-lg transition-colors"
                title="Copiar llista al centre"
              >
                Copiar
              </button>
            )}
          </div>
        </div>

        {/* Video count */}
        <p className="text-sm text-[var(--color-gray)] mb-2 font-[family-name:var(--font-inter)]">
          {playlist.video_count}{' '}
          {playlist.video_count === 1 ? 'vídeo' : 'vídeos'}
          {playlist.updated_at && ` · Actualitzat ${formatDate(playlist.updated_at)}`}
        </p>

        {/* Metadata badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 bg-[var(--color-light-bg)] text-[var(--color-gray)] rounded text-xs font-medium">
            {kindLabel}
          </span>

          {playlist.is_student_editable && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
              Editable per alumnes
            </span>
          )}

          {!playlist.is_deletable && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
              No eliminable
            </span>
          )}

          {playlist.origin_playlist_id && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              Còpia local
            </span>
          )}

          {isGlobal && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
              Compartida amb tots
            </span>
          )}
        </div>

      </div>
    </div>
  );
}

export type { Playlist, PlaylistCardProps };
