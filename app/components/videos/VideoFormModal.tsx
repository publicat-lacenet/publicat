'use client';

import { useState, useCallback, useEffect } from 'react';
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

interface VideoData {
  id: string;
  title: string;
  description: string | null;
  type: 'content' | 'announcement';
  vimeo_url: string;
  is_shared_with_other_centers: boolean;
  video_tags?: Array<{ tags: { id: string; name: string } }>;
  video_hashtags?: Array<{ hashtags: { id: string; name: string } }>;
}

interface VideoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editVideo?: VideoData | null;
}

export default function VideoFormModal({ isOpen, onClose, onSuccess, editVideo = null }: VideoFormModalProps) {
  const { role } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const isEditMode = !!editVideo;
  
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

  // Carregar dades del vídeo en mode edició
  useEffect(() => {
    if (isEditMode && editVideo) {
      setVimeoUrl(editVideo.vimeo_url);
      setIsVimeoValid(true);
      setTitle(editVideo.title);
      setDescription(editVideo.description || '');
      setType(editVideo.type);
      setIsShared(editVideo.is_shared_with_other_centers);
      
      const videoTagIds = editVideo.video_tags?.map(vt => vt.tags.id) || [];
      setTagIds(videoTagIds);
      
      // Carregar hashtags sense el símbol # per a l'input
      const videoHashtags = editVideo.video_hashtags
        ?.map(vh => vh.hashtags.name.replace(/^#/, '')) // Eliminar # inicial
        .join(', ') || '';
      setHashtags(videoHashtags);
    }
  }, [isEditMode, editVideo]);

  const handleVimeoValidation = useCallback((isValid: boolean, metadata?: VimeoMetadata) => {
    setIsVimeoValid(isValid);
    setVimeoMetadata(metadata ?? null);
    
    if (isValid && metadata?.title) {
      setTitle(prev => prev || metadata.title || '');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || tagIds.length === 0) {
      alert('Si us plau, omple tots els camps obligatoris');
      return;
    }

    if (!isEditMode && !vimeoUrl) {
      alert('Si us plau, introdueix una URL de Vimeo');
      return;
    }

    setSubmitting(true);

    try {
      // Processar hashtags: afegir # si no hi és
      const processedHashtags = hashtags
        .split(',')
        .map(h => h.trim())
        .filter(h => h.length > 0)
        .map(h => h.startsWith('#') ? h : '#' + h)
        .join(', ');

      const payload: Record<string, any> = {
        title,
        description: description || null,
        type,
        tag_ids: tagIds,
        hashtag_names: processedHashtags,
        is_shared_with_other_centers: isShared,
      };

      if (!isEditMode) {
        payload.vimeo_url = vimeoUrl;
        payload.thumbnail_url = vimeoMetadata?.thumbnail_url;
        payload.duration_seconds = vimeoMetadata?.duration;
      }

      const url = isEditMode ? `/api/videos/${editVideo!.id}` : '/api/videos';
      const method = isEditMode ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        alert(isEditMode ? '✅ Vídeo actualitzat correctament!' : '✅ Vídeo pujat correctament!');
        resetForm();
        onSuccess();
        onClose();
      } else {
        const errorMsg = data.error || (isEditMode ? 'No s\'ha pogut actualitzar el vídeo' : 'No s\'ha pogut crear el vídeo');
        alert(`❌ Error: ${errorMsg}`);
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
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Editar Vídeo' : 'Pujar Vídeo'}
          </h2>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {!isEditMode ? (
            <VimeoUrlInput
              value={vimeoUrl}
              onChange={setVimeoUrl}
              onValidationChange={handleVimeoValidation}
            />
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL de Vimeo
              </label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600">
                {vimeoUrl}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                La URL del vídeo no es pot modificar
              </p>
            </div>
          )}

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

          <TagSelector selectedTagIds={tagIds} onChange={setTagIds} />

          <HashtagInput value={hashtags} onChange={setHashtags} />

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
                isEditMode ? 'Actualitzar vídeo' : 'Pujar vídeo'
              }
            >
              {submitting ? (isEditMode ? 'Actualitzant...' : 'Pujant...') : (isEditMode ? 'Actualitzar Vídeo' : 'Pujar Vídeo')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
