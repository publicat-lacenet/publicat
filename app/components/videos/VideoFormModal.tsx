'use client';

import { useState, useCallback } from 'react';
import VimeoUrlInput from './VimeoUrlInput';
import TagSelector from './TagSelector';
import HashtagInput from './HashtagInput';
import { useAuth } from '@/utils/supabase/useAuth';

interface VimeoMetadata {
  vimeo_id?: string;
  title?: string;
  duration?: number;
  thumbnail_url?: string;
}

interface VideoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function VideoFormModal({ isOpen, onClose, onSuccess }: VideoFormModalProps) {
  const { role } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [vimeoUrl, setVimeoUrl] = useState('');
  const [isVimeoValid, setIsVimeoValid] = useState(false);
  const [vimeoMetadata, setVimeoMetadata] = useState<VimeoMetadata | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'content' | 'announcement'>('content');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState('');
  const [isShared, setIsShared] = useState(false);

  const canShare = role === 'editor_profe' || role === 'admin_global';

  // Auto-rellenar título desde metadata - memoizado para evitar re-renders
  const handleVimeoValidation = useCallback((isValid: boolean, metadata?: VimeoMetadata) => {
    setIsVimeoValid(isValid);
    setVimeoMetadata(metadata ?? null);
    
    if (isValid && metadata?.title) {
      setTitle(prev => prev || metadata.title || '');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vimeoUrl || !title || tagIds.length === 0) {
      alert('Si us plau, omple tots els camps obligatoris');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vimeo_url: vimeoUrl,
          title,
          description: description || null,
          type,
          tag_ids: tagIds,
          hashtag_names: hashtags,
          is_shared_with_other_centers: isShared,
          thumbnail_url: vimeoMetadata?.thumbnail_url,
          duration_seconds: vimeoMetadata?.duration,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('✅ Vídeo pujat correctament!');
        resetForm();
        onSuccess();
        onClose();
      } else {
        alert(`❌ Error: ${data.error || 'No s\'ha pogut crear el vídeo'}`);
      }
    } catch {
      alert('❌ Error de connexió');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setVimeoUrl('');
    setIsVimeoValid(false);
    setVimeoMetadata(null);
    setTitle('');
    setDescription('');
    setType('content');
    setTagIds([]);
    setHashtags('');
    setIsShared(false);
  };

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Pujar Vídeo</h2>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Vimeo URL */}
          <VimeoUrlInput
            value={vimeoUrl}
            onChange={setVimeoUrl}
            onValidationChange={handleVimeoValidation}
          />

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Títol *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Títol del vídeo"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripció (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripció del contingut..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipus *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'content' | 'announcement')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="content">Contingut</option>
              <option value="announcement">Anunci</option>
            </select>
          </div>

          {/* Tags */}
          <TagSelector selectedTagIds={tagIds} onChange={setTagIds} />
          
          {/* Debug info - temporal */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500">
              Debug: {tagIds.length} tags seleccionats: {JSON.stringify(tagIds)}
            </div>
          )}

          {/* Hashtags */}
          <HashtagInput value={hashtags} onChange={setHashtags} />

          {/* Compartir con otros centros */}
          {canShare && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <input
                type="checkbox"
                id="isShared"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isShared" className="text-sm text-gray-700 cursor-pointer">
                Compartir amb altres centres
              </label>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel·lar
            </button>
            <button
              type="submit"
              disabled={submitting || !title || tagIds.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                !title ? 'Falta el títol' :
                tagIds.length === 0 ? 'Selecciona almenys una etiqueta' :
                'Pujar vídeo'
              }
            >
              {submitting ? 'Pujant...' : 'Pujar Vídeo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
