'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import VideoUploader, { VimeoMetadata as UploadMetadata } from './VideoUploader';
import TagSelector from './TagSelector';
import HashtagInput from './HashtagInput';
import { useAuth } from '@/utils/supabase/useAuth';
import { parseHashtagInput, formatHashtagsForInput } from '@/lib/hashtags';
import { MessageSquareWarning } from 'lucide-react';

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
  vimeo_id?: string | null;
  vimeo_hash?: string | null;
  is_shared_with_other_centers: boolean;
  status?: string;
  rejection_comment?: string | null;
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
  // Mode revisió: alumne editant el seu propi vídeo en needs_revision
  const isRevisionMode = isEditMode && editVideo?.status === 'needs_revision' && role === 'editor_alumne';

  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete'>('idle');
  const [hasNewVideo, setHasNewVideo] = useState(false); // Si l'alumne ha pujat un vídeo nou

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
  const pendingVideoIdRef = useRef<string | null>(null);

  const canShare = role === 'editor_profe' || role === 'admin_global';

  // Carregar dades del vídeo en mode edició
  useEffect(() => {
    if (isEditMode && editVideo) {
      setVimeoUrl(editVideo.vimeo_url);
      setIsVimeoValid(true); // El vídeo existent ja és vàlid
      setTitle(editVideo.title);
      setDescription(editVideo.description || '');
      setType(editVideo.type);
      setIsShared(editVideo.is_shared_with_other_centers);
      setHasNewVideo(false);

      const videoTagIds = editVideo.video_tags?.map(vt => vt.tags.id) || [];
      setTagIds(videoTagIds);

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

  const handleUploadComplete = useCallback((uploadedUrl: string, metadata: UploadMetadata) => {
    setVimeoUrl(uploadedUrl);
    setIsVimeoValid(true);
    setHasNewVideo(true);
    setVimeoMetadata({
      vimeo_id: metadata.video_id,
      vimeo_hash: metadata.vimeo_hash,
      thumbnail_url: metadata.thumbnail_url,
      duration: metadata.duration,
      title: title || 'Vídeo sense títol',
    });
  }, [title]);

  const handleUploadError = useCallback((error: string) => {
    alert(`Error: ${error}`);
  }, []);

  const handleStatusChange = useCallback((status: 'idle' | 'uploading' | 'processing' | 'complete') => {
    setUploadStatus(status);
  }, []);

  const handleFramesExtracted = useCallback(async (urls: string[]) => {
    setFramesUrls(urls);
    if (pendingVideoIdRef.current && urls.length > 0) {
      const videoId = pendingVideoIdRef.current;
      pendingVideoIdRef.current = null;
      try {
        await fetch(`/api/videos/${videoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frames_urls: urls }),
        });
      } catch {
        console.warn('[VideoFormModal] No s\'ha pogut actualitzar frames_urls al vídeo creat');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const processedHashtags = parseHashtagInput(hashtags)
        .map(h => '#' + h)
        .join(', ');

      // ---- MODE REVISIÓ: enviar correcció ----
      if (isRevisionMode) {
        const payload: Record<string, any> = {
          action: 'submit_revision',
          title,
          description: description || null,
          type,
          tag_ids: tagIds,
          hashtag_names: processedHashtags,
        };

        // Incloure dades del nou vídeo si l'alumne ha pujat un de nou
        if (hasNewVideo && vimeoMetadata?.vimeo_id && vimeoMetadata.vimeo_id !== editVideo?.vimeo_id) {
          payload.vimeo_url = vimeoUrl;
          payload.vimeo_id = vimeoMetadata.vimeo_id;
          payload.vimeo_hash = vimeoMetadata.vimeo_hash ?? null;
          payload.thumbnail_url = vimeoMetadata.thumbnail_url ?? null;
          payload.duration_seconds = vimeoMetadata.duration ?? null;
          payload.frames_urls = framesUrls;
        }

        const res = await fetch(`/api/videos/${editVideo!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.ok) {
          alert('Correcció enviada correctament. El professor la revisarà aviat.');
          resetForm();
          onSuccess();
          onClose();
        } else {
          alert(`Error: ${data.error || 'No s\'ha pogut enviar la correcció'}`);
        }
        return;
      }

      // ---- MODE EDICIÓ NORMAL ----
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
        alert(isEditMode ? 'Vídeo actualitzat correctament!' : 'Vídeo pujat correctament!');
        if (!isEditMode && data.video?.id) {
          pendingVideoIdRef.current = data.video.id;
        }
        resetForm();
        onSuccess();
        onClose();
      } else {
        const errorMsg = data.error || (isEditMode ? 'No s\'ha pogut actualitzar el vídeo' : 'No s\'ha pogut crear el vídeo');
        alert(`Error: ${errorMsg}`);
      }
    } catch {
      alert('Error de connexió');
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
    setHasNewVideo(false);
    setUploadStatus('idle');
  };

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalTitle = isRevisionMode ? 'Corregir vídeo' : isEditMode ? 'Editar Vídeo' : 'Pujar Vídeo';
  const submitLabel = isRevisionMode
    ? (submitting ? 'Enviant...' : 'Enviar per revisió')
    : isEditMode
      ? (submitting ? 'Actualitzant...' : 'Actualitzar Vídeo')
      : (submitting ? 'Pujant...' : 'Pujar Vídeo');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {modalTitle}
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

          {/* Comentari del professor (mode revisió) */}
          {isRevisionMode && editVideo?.rejection_comment && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                <MessageSquareWarning className="w-4 h-4" />
                Comentari del professor:
              </p>
              <p className="text-sm text-red-800 leading-relaxed whitespace-pre-wrap">
                {editVideo.rejection_comment}
              </p>
            </div>
          )}

          {/* Secció del vídeo */}
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
                    {uploadStatus === 'uploading' && 'Pujant vídeo a Vimeo...'}
                    {uploadStatus === 'processing' && 'Processant vídeo... El botó s\'activarà quan finalitzi el processament.'}
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
          ) : isRevisionMode ? (
            /* Mode revisió: mostrar uploader opcional per substituir el vídeo */
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Substituir el vídeo <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Si el problema és el contingut visual, pots pujar un vídeo nou. Si no, simplement corregeix les metadades a continuació.
                </p>
                <VideoUploader
                  onUploadComplete={handleUploadComplete}
                  onError={handleUploadError}
                  onStatusChange={handleStatusChange}
                  onFramesExtracted={handleFramesExtracted}
                />
              </div>
              {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    {uploadStatus === 'uploading' && 'Pujant vídeo nou a Vimeo...'}
                    {uploadStatus === 'processing' && 'Processant vídeo nou...'}
                  </p>
                </div>
              )}
              {hasNewVideo && vimeoUrl && isVimeoValid && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium">Vídeo nou llest per substituir l&apos;anterior</span>
                </div>
              )}
              {!hasNewVideo && (
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-500">
                    Vídeo actual: <span className="font-medium text-gray-700">{editVideo?.vimeo_url}</span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Mode edició normal: URL del vídeo de lectura */
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

          {canShare && !isRevisionMode && (
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
              disabled={
                submitting ||
                !title ||
                tagIds.length === 0 ||
                (!isEditMode && (uploadStatus === 'uploading' || uploadStatus === 'processing')) ||
                (isRevisionMode && (uploadStatus === 'uploading' || uploadStatus === 'processing'))
              }
              className={`px-6 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                isRevisionMode
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
