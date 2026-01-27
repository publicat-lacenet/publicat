'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import VimeoPlayer, { VimeoPlayerHandle } from './VimeoPlayer';
import Image from 'next/image';

export interface AnnouncementVideo {
  id: string;
  title: string;
  vimeo_id: string;
  vimeo_hash?: string | null;
}

interface AnnouncementZoneProps {
  videos: AnnouncementVideo[];
  volume?: number;
  showFallback?: boolean;
  centerLogo?: string | null;
  primaryColor?: string;
}

export default function AnnouncementZone({
  videos,
  volume = 0,
  showFallback = true,
  centerLogo,
  primaryColor = '#FEDD2C',
}: AnnouncementZoneProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const playerRef = useRef<VimeoPlayerHandle>(null);

  const currentVideo = videos[currentIndex];

  // Set volume when it changes
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setVolume(volume);
    }
  }, [volume]);

  const goToNextVideo = useCallback(() => {
    if (videos.length <= 1) return;

    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % videos.length;
        return nextIndex;
      });
      setIsTransitioning(false);
    }, 200);
  }, [videos.length]);

  const handleVideoEnd = useCallback(() => {
    goToNextVideo();
  }, [goToNextVideo]);

  const handleVideoError = useCallback(() => {
    // Skip to next video on error
    goToNextVideo();
  }, [goToNextVideo]);

  // No announcements - show fallback
  if (!videos.length) {
    if (!showFallback) return null;

    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: primaryColor }}
      >
        {centerLogo ? (
          <Image
            src={centerLogo}
            alt="Logo"
            width={80}
            height={80}
            className="object-contain opacity-80"
          />
        ) : (
          <Image
            src="/logo_videos.png"
            alt="PUBLI*CAT"
            width={80}
            height={80}
            className="object-contain opacity-80"
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div
        className={`w-full h-full transition-opacity duration-200 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {currentVideo && (
          <VimeoPlayer
            ref={playerRef}
            key={currentVideo.id}
            vimeoId={currentVideo.vimeo_id}
            vimeoHash={currentVideo.vimeo_hash}
            autoplay={true}
            muted={volume === 0}
            volume={volume}
            loop={videos.length === 1}
            controls={false}
            background={false}
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            className="w-full h-full [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:object-cover"
          />
        )}
      </div>

      {/* Badge indicador */}
      <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white/80">
        Anunci
      </div>
    </div>
  );
}
