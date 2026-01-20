'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/app/components/ui/Modal';
import { useRSSValidation } from '@/hooks/useRSSValidation';
import { formatDistanceToNow } from 'date-fns';
import { ca } from 'date-fns/locale';
import type { RSSFeed } from './RSSFeedCard';

interface RSSFeedFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: RSSFeed | null;
}

export default function RSSFeedFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: RSSFeedFormModalProps) {
  const isEditing = !!initialData;
  const { state: validationState, validate, reset: resetValidation } = useRSSValidation();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [isInRotation, setIsInRotation] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setUrl(initialData.url);
        setIsInRotation(initialData.is_in_rotation);
      } else {
        setName('');
        setUrl('');
        setIsInRotation(true);
      }
      setError(null);
      resetValidation();
    }
  }, [isOpen, initialData, resetValidation]);

  // Validate URL when it changes (only for new feeds or changed URLs)
  const handleUrlChange = useCallback(
    (newUrl: string) => {
      setUrl(newUrl);
      if (!isEditing || newUrl !== initialData?.url) {
        validate(newUrl);
      }
    },
    [isEditing, initialData?.url, validate]
  );

  // Auto-fill name from feed title when creating
  useEffect(() => {
    if (!isEditing && validationState.status === 'valid' && validationState.feedTitle && !name) {
      setName(validationState.feedTitle);
    }
  }, [isEditing, validationState.status, validationState.feedTitle, name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate name
    if (!name.trim()) {
      setError('El nom del feed és obligatori');
      return;
    }

    // Validate URL
    if (!url.trim()) {
      setError("L'URL del feed és obligatòria");
      return;
    }

    // For new feeds, URL must be valid
    if (!isEditing && validationState.status !== 'valid') {
      setError("L'URL del feed no és vàlida");
      return;
    }

    // For edited feeds with changed URL, must be valid
    if (isEditing && url !== initialData?.url && validationState.status !== 'valid') {
      setError("La nova URL del feed no és vàlida");
      return;
    }

    setSaving(true);

    try {
      const endpoint = isEditing ? `/api/rss/${initialData.id}` : '/api/rss';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          is_in_rotation: isInRotation,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error guardant el feed');
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error saving feed:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatPubDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ca });
    } catch {
      return '';
    }
  };

  const canSave =
    name.trim() &&
    url.trim() &&
    !saving &&
    (isEditing
      ? url === initialData?.url || validationState.status === 'valid'
      : validationState.status === 'valid');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Feed RSS' : 'Afegir Feed RSS'}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-[var(--color-gray)] hover:text-[var(--color-dark)] transition-colors"
          >
            Cancel·lar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSave}
            className="px-4 py-2 bg-[var(--color-secondary)] hover:bg-[var(--color-primary)] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardant...' : isEditing ? 'Guardar canvis' : 'Crear feed'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom del feed *
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: 324 - Últimes notícies"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL del feed *
          </label>
          <input
            type="url"
            value={url}
            onChange={e => handleUrlChange(e.target.value)}
            placeholder="https://exemple.com/rss.xml"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Validation status */}
        {url && validationState.status === 'validating' && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Validant feed...
          </div>
        )}

        {url && validationState.status === 'error' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{validationState.error}</p>
          </div>
        )}

        {url && validationState.status === 'valid' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-3">
            <p className="text-sm text-green-700 font-medium">
              Feed vàlid - {validationState.itemCount} ítems trobats
            </p>

            {/* Preview items */}
            {validationState.preview.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Vista prèvia
                </p>
                {validationState.preview.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-2 bg-white rounded border border-gray-100"
                  >
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt=""
                        className="w-16 h-12 object-cover rounded flex-shrink-0"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 line-clamp-2">
                        {item.title}
                      </p>
                      {item.pub_date && (
                        <p className="text-xs text-gray-500">
                          {formatPubDate(item.pub_date)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Include in rotation */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_in_rotation"
            checked={isInRotation}
            onChange={e => setIsInRotation(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="is_in_rotation" className="text-sm text-gray-700">
            Incloure a la rotació de pantalla
          </label>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </form>
    </Modal>
  );
}

export type { RSSFeedFormModalProps };
