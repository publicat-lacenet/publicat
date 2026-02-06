'use client';

import { useState } from 'react';
import Modal from '@/app/components/ui/Modal';

interface PlaylistFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: {
    id: string;
    name: string;
    is_student_editable: boolean;
  };
}

export default function PlaylistFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: PlaylistFormModalProps) {
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name || '');
  const [isStudentEditable, setIsStudentEditable] = useState(
    initialData?.is_student_editable || false
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('El nom de la llista és obligatori');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = isEditing
        ? `/api/playlists/${initialData.id}`
        : '/api/playlists';
      const method = isEditing ? 'PATCH' : 'POST';

      const body: any = {
        name: name.trim(),
        is_student_editable: isStudentEditable,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error guardant la llista');
      }

      // Reset form
      setName('');
      setIsStudentEditable(false);

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error saving playlist:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName(initialData?.name || '');
    setIsStudentEditable(initialData?.is_student_editable || false);
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Editar Llista' : 'Nova Llista'}
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-[var(--color-dark)] bg-[var(--color-light-bg)] hover:bg-gray-200 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancel·lar
          </button>
          <button
            type="submit"
            form="playlist-form"
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-secondary)] hover:bg-[var(--color-primary)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !name.trim()}
          >
            {loading ? 'Guardant...' : isEditing ? 'Guardar Canvis' : 'Crear Llista'}
          </button>
        </>
      }
    >
      <form id="playlist-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Name input */}
        <div>
          <label
            htmlFor="playlist-name"
            className="block text-sm font-medium text-[var(--color-dark)] mb-1"
          >
            Nom de la llista *
          </label>
          <input
            id="playlist-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Projecte de Ciències"
            className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] focus:border-transparent"
            disabled={loading}
            autoFocus
          />
        </div>

        {/* Student editable checkbox */}
        <div className="flex items-start gap-3">
          <input
            id="student-editable"
            type="checkbox"
            checked={isStudentEditable}
            onChange={(e) => setIsStudentEditable(e.target.checked)}
            className="mt-1 w-4 h-4 text-[var(--color-secondary)] border-[var(--color-border)] rounded focus:ring-[var(--color-secondary)]"
            disabled={loading}
          />
          <div>
            <label
              htmlFor="student-editable"
              className="text-sm font-medium text-[var(--color-dark)] cursor-pointer"
            >
              Editable per alumnes
            </label>
            <p className="text-xs text-[var(--color-gray)]">
              Permet que els editor-alumne puguin afegir, eliminar i reordenar
              vídeos en aquesta llista
            </p>
          </div>
        </div>

        {/* Helper text */}
        <p className="text-xs text-[var(--color-gray)]">
          Les llistes personalitzades es poden eliminar. Les llistes
          predefinides (dies de la setmana i anuncis) no es poden eliminar.
        </p>
      </form>
    </Modal>
  );
}

export type { PlaylistFormModalProps };
