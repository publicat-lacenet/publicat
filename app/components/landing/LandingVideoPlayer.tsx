'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Monitor } from 'lucide-react';
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

interface LandingPlaylistData {
  playlist: { id: string; name: string } | null;
  videos: Video[];
}

export default function LandingVideoPlayer() {
  const [data, setData] = useState<LandingPlaylistData | null>(null);
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
        setData(json);
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
    if (!data?.videos.length) return;
    setCurrentIndex((prev) => (prev + 1) % data.videos.length);
  }, [data?.videos.length]);

  // Handle video error
  const handleVideoError = useCallback(() => {
    console.error('Error playing video, skipping to next');
    handleVideoEnd();
  }, [handleVideoEnd]);

  // Get Vimeo ID from current video
  const getVimeoId = (video: Video): string | null => {
    if (video.vimeo_id) return video.vimeo_id;

    // Try to extract from URL
    const match = video.vimeo_url?.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  };

  // Loading state
  if (loading) {
    return (
      <div className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center">
        <div className="text-white/60 text-sm">Carregant...</div>
      </div>
    );
  }

  // Error or no videos
  if (error || !data?.videos.length) {
    return (
      <div className="relative w-full aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden flex items-center justify-center">
        <div className="text-center text-white/80 p-8">
          <Monitor className="w-10 h-10 mx-auto mb-4" />
          <p className="text-lg font-medium">Contingut en preparació</p>
          <p className="text-sm text-white/60 mt-2">Aviat podràs veure vídeos dels centres educatius</p>
        </div>
      </div>
    );
  }

  const currentVideo = data.videos[currentIndex];
  const vimeoId = getVimeoId(currentVideo);

  if (!vimeoId) {
    // Skip to next video if current one is invalid
    setTimeout(handleVideoEnd, 100);
    return null;
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group">
      {/* Video Player */}
      <VimeoPlayer
        vimeoId={vimeoId}
        vimeoHash={currentVideo.vimeo_hash}
        autoplay
        muted
        loop={data.videos.length === 1}
        controls={false}
        background={true}
        onEnded={handleVideoEnd}
        onError={handleVideoError}
        className="absolute inset-0 w-full h-full"
      />

      {/* Expand button */}
      <Link
        href="/pantalla/landing"
        target="_blank"
        className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white rounded-lg text-sm font-medium transition-all opacity-70 group-hover:opacity-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
        Ampliar
      </Link>

      {/* Video counter (subtle) */}
      {data.videos.length > 1 && (
        <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/40 backdrop-blur-sm text-white/70 rounded text-xs opacity-70 group-hover:opacity-100 transition-opacity">
          {currentIndex + 1} / {data.videos.length}
        </div>
      )}
    </div>
  );
}
