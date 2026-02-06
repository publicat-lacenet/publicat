'use client';

import { useState, useEffect, useCallback } from 'react';
import VimeoPlayer from '@/app/components/display/VimeoPlayer';

interface Video {
  id: string;
  title: string;
  vimeo_url: string;
  vimeo_id: string | null;
  vimeo_hash: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  position: number;
}

export default function PantallaLandingPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch playlist data
  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const res = await fetch('/api/landing/playlist');
        if (!res.ok) throw new Error('Error carregant la llista');
        const json = await res.json();
        setVideos(json.videos || []);
      } catch (err) {
        console.error('Error fetching landing playlist:', err);
        setError('No s\'ha pogut carregar el contingut');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();
  }, []);

  // Handle video end - move to next video (loop)
  const handleVideoEnd = useCallback(() => {
    if (!videos.length) return;
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  }, [videos.length]);

  // Handle video error
  const handleVideoError = useCallback(() => {
    console.error('Error playing video, skipping to next');
    handleVideoEnd();
  }, [handleVideoEnd]);

  // Extract Vimeo ID
  const getVimeoId = (video: Video): string | null => {
    if (video.vimeo_id) return video.vimeo_id;
    const match = video.vimeo_url?.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-white/60 text-lg">Carregant...</div>
      </div>
    );
  }

  // Error or no videos
  if (error || !videos.length) {
    return (
      <div className="w-screen h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center text-white/80 p-8">
          <div className="text-6xl mb-6">📺</div>
          <p className="text-2xl font-medium">Contingut en preparació</p>
          <p className="text-lg text-white/60 mt-4">Aviat podràs veure vídeos dels centres educatius</p>
        </div>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];
  const vimeoId = getVimeoId(currentVideo);

  if (!vimeoId) {
    setTimeout(handleVideoEnd, 100);
    return null;
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden">
      <VimeoPlayer
        vimeoId={vimeoId}
        vimeoHash={currentVideo.vimeo_hash}
        autoplay
        muted={false}
        loop={videos.length === 1}
        controls={false}
        background={false}
        onEnded={handleVideoEnd}
        onError={handleVideoError}
        className="w-full h-full"
      />

      {/* Video counter (subtle, bottom left) */}
      {videos.length > 1 && (
        <div className="absolute bottom-4 left-4 px-4 py-2 bg-black/50 backdrop-blur-sm text-white/80 rounded-lg text-sm">
          {currentIndex + 1} / {videos.length}
        </div>
      )}
    </div>
  );
}
