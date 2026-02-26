'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import VideoUploader, { VimeoMetadata as UploadMetadata } from './VideoUploader';
import TagSelector from './TagSelector';
import HashtagInput from './HashtagInput';
import { useAuth } from '@/utils/supabase/useAuth';
import { parseHashtagInput, formatHashtagsForInput } from '@/lib/hashtags';

interface VimeoMetadata {
  vimeo_id?: string;
  vimeo_hash?: string | null;
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
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete'>('idle');
  
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
  const [framesUrls, setFramesUrls] = useState<string[]>([]);
  // Si el formulari s'envia abans que acabi l'extracció, guardem el videoId
  // per fer un PATCH quan onFramesExtracted arribi tard
  const pendingVideoIdRef = useRef<string | null>(null);

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
      
      // Carregar hashtags per a l'input
      const hashtagNames = editVideo.video_hashtags?.map(vh => vh.hashtags.name) || [];
      setHashtags(formatHashtagsForInput(hashtagNames));
    }
  }, [isEditMode, editVideo]);

  const handleVimeoValidation = useCallback((isValid: boolean, metadata?: VimeoMetadata) => {
    setIsVimeoValid(isValid);
    setVimeoMetadata(metadata ?? null);
    
    if (isValid && metadata?.title) {
      setTitle(prev => prev || metadata.title || '');
    }
  }, []);

  const handleUploadComplete = useCallback((vimeoUrl: string, metadata: UploadMetadata) => {
    console.log('📹 handleUploadComplete called with:', { vimeoUrl, metadata });
    setVimeoUrl(vimeoUrl);
    setIsVimeoValid(true);
    setVimeoMetadata({
      vimeo_id: metadata.video_id,
      vimeo_hash: metadata.vimeo_hash,
      thumbnail_url: metadata.thumbnail_url,
      duration: metadata.duration,
      title: title || 'Vídeo sense títol',
    });
    console.log('✅ Estat actualitzat - vimeoUrl:', vimeoUrl, 'isValid:', true);
  }, [title]);

  const handleUploadError = useCallback((error: string) => {
    alert(`❌ Error: ${error}`);
  }, []);
  
  const handleStatusChange = useCallback((status: 'idle' | 'uploading' | 'processing' | 'complete') => {
    setUploadStatus(status);
  }, []);

  // Callback quan l'extracció de fotogrames finalitza (pot arribar abans o després del submit)
  const handleFramesExtracted = useCallback(async (urls: string[]) => {
    setFramesUrls(urls);
    // Si el vídeo ja s'ha creat a la BD (submit va ser primer), actualitzar frames_urls
    if (pendingVideoIdRef.current && urls.length > 0) {
      const videoId = pendingVideoIdRef.current;
      pendingVideoIdRef.current = null;
      try {
        await fetch(`/api/videos/${videoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frames_urls: urls }),
        });
        console.log(`✅ [VideoFormModal] frames_urls actualitzat al vídeo ${videoId} (${urls.length} frames)`);
      } catch {
        console.warn('[VideoFormModal] No s\'ha pogut actualitzar frames_urls al vídeo creat');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 handleSubmit - Estat actual:', { 
      title, 
      tagIds: tagIds.length, 
      vimeoUrl, 
      isVimeoValid,
      isEditMode 
    });
    
    if (!title) {
      alert('Si us plau, introdueix un títol');
      return;
    }
    
    if (tagIds.length === 0) {
      alert('Si us plau, selecciona almenys una etiqueta');
      return;
    }

    if (!isEditMode && !vimeoUrl) {
      alert('Si us plau, introdueix una URL de Vimeo o puja un fitxer');
      return;
    }
    
    if (!isEditMode && !isVimeoValid) {
      alert('Si us plau, espera que el vídeo es processi completament');
      return;
    }

    setSubmitting(true);

    try {
      // Processar hashtags amb parsing robust
      const processedHashtags = parseHashtagInput(hashtags)
        .map(h => '#' + h)
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
        payload.vimeo_hash = vimeoMetadata?.vimeo_hash;
        payload.thumbnail_url = vimeoMetadata?.thumbnail_url;
        payload.duration_seconds = vimeoMetadata?.duration;
        payload.frames_urls = framesUrls;
        console.log('📊 Vimeo metadata:', vimeoMetadata);
        console.log('⏱️ Duration being sent:', vimeoMetadata?.duration);
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
        // Si és creació i l'extracció pot estar en curs, guardar videoId per al PATCH tardà
        if (!isEditMode && data.video?.id) {
          pendingVideoIdRef.current = data.video.id;
        }
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
    setFramesUrls([]);
    // No netejem pendingVideoIdRef aquí — pot necessitar-se per al PATCH tardà
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
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selecciona el vídeo a pujar
              </label>
              <VideoUploader
                onUploadComplete={handleUploadComplete}
                onError={handleUploadError}
                onStatusChange={handleStatusChange}
                onFramesExtracted={handleFramesExtracted}
              />
              {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    {uploadStatus === 'uploading' && '⏫ Pujant vídeo a Vimeo...'}
                    {uploadStatus === 'processing' && '⏳ Processant vídeo... El botó "Pujar Vídeo" s\'activarà quan finalitzi el processament.'}
                  </p>
                </div>
              )}
              {vimeoUrl && isVimeoValid && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium">Vídeo llest per publicar</span>
                </div>
              )}
            </div>
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
              disabled={submitting || !title || tagIds.length === 0 || (!isEditMode && (uploadStatus === 'uploading' || uploadStatus === 'processing'))}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                !title ? 'Falta el títol' :
                tagIds.length === 0 ? 'Selecciona almenys una etiqueta' :
                uploadStatus === 'uploading' ? 'Esperant que finalitzi la pujada' :
                uploadStatus === 'processing' ? 'Esperant que finalitzi el processament' :
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
