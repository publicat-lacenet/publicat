'use client';

import { useState, useRef } from 'react';
import * as tus from 'tus-js-client';
import { extractFrames } from '@/lib/display/frameExtractor';
import { createClient } from '@/utils/supabase/client';

interface VideoUploaderProps {
  onUploadComplete: (vimeoUrl: string, metadata: VimeoMetadata) => void;
  onError: (error: string) => void;
  onStatusChange?: (status: 'idle' | 'uploading' | 'processing' | 'complete') => void;
  onFramesExtracted?: (framesUrls: string[]) => void;
}

export interface VimeoMetadata {
  video_id: string;
  vimeo_hash: string | null;
  thumbnail_url: string;
  duration: number;
}

export default function VideoUploader({ onUploadComplete, onError, onStatusChange, onFramesExtracted }: VideoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete'>('idle');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<tus.Upload | null>(null);
  const fileRef = useRef<File | null>(null);
  
  // Notificar canvis d'estat
  const updateStatus = (newStatus: typeof status) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  };
  
  const handleFileSelect = async (file: File) => {
    if (!file) return;
    
    // Validar format
    const allowedFormats = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
    if (!allowedFormats.includes(file.type)) {
      onError('Format no suportat. Utilitza mp4, mov, avi, mkv o webm');
      return;
    }
    
    // Validar mida
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxSize) {
      onError('El fitxer supera els 2GB');
      return;
    }
    
    setFileName(file.name);
    fileRef.current = file;
    setUploading(true);
    updateStatus('uploading');
    setProgress(0);
    
    try {
      // 1. Obtenir ticket d'upload de Vimeo
      const ticketRes = await fetch('/api/vimeo/upload/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_size: file.size,
          file_name: file.name,
        }),
      });
      
      if (!ticketRes.ok) {
        const error = await ticketRes.json();
        throw new Error(error.error || 'Error creant upload ticket');
      }
      
      const { upload_link, video_id } = await ticketRes.json();
      
      // 2. Pujar fitxer amb Tus
      const upload = new tus.Upload(file, {
        endpoint: upload_link,
        uploadUrl: upload_link,
        chunkSize: 10 * 1024 * 1024, // 10MB chunks
        retryDelays: [0, 1000, 3000, 5000],
        metadata: {
          filename: file.name,
          filetype: file.type,
        },
        onError: (error) => {
          console.error('Error durant la pujada:', error);
          onError('Error pujant el vídeo. Si us plau, torna-ho a intentar.');
          setUploading(false);
          updateStatus('idle');
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          setProgress(percentage);
        },
        onSuccess: async () => {
          console.log('Pujada completada!');
          updateStatus('processing');
          
          // 3. Polling per esperar que Vimeo processi el vídeo
          await pollVideoStatus(video_id);
        },
      });
      
      uploadRef.current = upload;
      upload.start();
      
    } catch (error: unknown) {
      console.error('Error:', error);
      onError(error instanceof Error ? error.message : 'Error inesperat');
      setUploading(false);
      updateStatus('idle');
    }
  };
  
  const pollVideoStatus = async (videoId: string) => {
    const maxAttempts = 60; // 5 minuts màxim
    let attempts = 0;
    
    const poll = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        onError('Timeout: el vídeo està trigant massa a processar-se');
        setUploading(false);
        updateStatus('idle');
        return;
      }
      
      try {
        const res = await fetch(`/api/vimeo/status/${videoId}`);
        const data = await res.json();
        
        console.log(`📊 Polling attempt ${attempts + 1}:`, data);
        
        // Esperar que el vídeo sigui playable I tingui thumbnail real (no placeholder)
        if (data.is_playable && data.has_real_thumbnail) {
          // Vídeo llest amb thumbnail real!
          const vimeoUrl = data.link;
          const metadata: VimeoMetadata = {
            video_id: videoId,
            vimeo_hash: data.vimeo_hash,
            thumbnail_url: data.thumbnail,
            duration: data.duration,
          };
          
          console.log('✅ Vídeo disponible amb thumbnail real! Cridant onUploadComplete amb:', { vimeoUrl, metadata });

          // IMPORTANT: Cridem onUploadComplete ABANS de canviar l'estat local
          // perquè el pare pugui rebre les dades correctament
          onUploadComplete(vimeoUrl, metadata);

          updateStatus('complete');
          setUploading(false);

          // Extracció de fotogrames en background (no bloqueja el flux principal)
          if (onFramesExtracted && fileRef.current) {
            const capturedFile = fileRef.current;
            const capturedVideoId = videoId;
            extractFramesInBackground(capturedFile, capturedVideoId);
          }
          
        } else {
          // Encara processant, retry en 5 segons
          attempts++;
          setTimeout(poll, 5000);
        }
        
      } catch (error) {
        console.error('Error checking video status:', error);
        attempts++;
        setTimeout(poll, 5000);
      }
    };
    
    poll();
  };
  
  const extractFramesInBackground = async (file: File, videoId: string) => {
    try {
      console.log(`🖼️ [VideoUploader] Iniciant extracció de fotogrames per vídeo ${videoId}`);
      const blobs = await extractFrames(file, 3);
      if (blobs.length === 0) {
        console.log('[VideoUploader] Cap fotograma extret');
        onFramesExtracted?.([]);
        return;
      }

      const supabase = createClient();
      const urls: string[] = [];

      for (let i = 0; i < blobs.length; i++) {
        const path = `${videoId}/frame_${i}.jpg`;
        const { error } = await supabase.storage
          .from('announcement-frames')
          .upload(path, blobs[i], { contentType: 'image/jpeg', upsert: true });

        if (error) {
          console.warn(`[VideoUploader] Error pujant frame ${i}:`, error.message);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('announcement-frames')
          .getPublicUrl(path);

        if (urlData?.publicUrl) {
          urls.push(urlData.publicUrl);
        }
      }

      console.log(`✅ [VideoUploader] ${urls.length} fotogrames pujats a Storage`);
      onFramesExtracted?.(urls);
    } catch (err) {
      // Errors silenciosos — l'extracció és secundària
      console.warn('[VideoUploader] Error en extracció de fotogrames (silenciós):', err);
      onFramesExtracted?.([]);
    }
  };

  const handleCancel = () => {
    if (uploadRef.current) {
      uploadRef.current.abort();
      uploadRef.current = null;
    }
    setUploading(false);
    updateStatus('idle');
    setProgress(0);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  return (
    <div className="space-y-4">
      {status === 'idle' ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-secondary transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />
          <div className="text-gray-600">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-sm font-medium">Arrossega un vídeo aquí o fes clic per seleccionar</p>
            <p className="mt-1 text-xs text-gray-500">MP4, MOV, AVI, MKV o WebM (màx. 2GB)</p>
          </div>
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 truncate max-w-[70%]">{fileName}</span>
            {status === 'uploading' && (
              <button
                onClick={handleCancel}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Cancel·lar
              </button>
            )}
          </div>
          
          {status === 'uploading' && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-secondary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 text-center">{progress}% pujat</p>
            </>
          )}
          
          {status === 'processing' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Processant vídeo a Vimeo...</p>
              <p className="text-xs text-gray-500 mt-1">Això pot trigar uns minuts</p>
            </div>
          )}
          
          {status === 'complete' && (
            <div className="text-center text-green-600">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="mt-2 text-sm font-medium">Vídeo pujat correctament!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
