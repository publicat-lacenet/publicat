'use client';

import { useState, useCallback, useRef } from 'react';
import VimeoPlayerUniversal from './VimeoPlayerUniversal';
import Image from 'next/image';

export interface AnnouncementVideo {
  id: string;
  title: string;
  vimeo_id: string;
  vimeo_hash?: string | null;
}

const PRIMARY_COLOR = '#FEDD2C';

interface AnnouncementZoneProps {
  videos: AnnouncementVideo[];
  volume?: number;
  showFallback?: boolean;
  centerLogo?: string | null;
}

export default function AnnouncementZone({
  videos,
  volume = 0,
  showFallback = true,
  centerLogo,
}: AnnouncementZoneProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const audioBlockedLoggedRef = useRef(false);

  const handleAudioBlocked = useCallback(() => {
    if (!audioBlockedLoggedRef.current) {
      console.log('[AnnouncementZone] autoplay with audio blocked by browser');
      audioBlockedLoggedRef.current = true;
    }
  }, []);

  const currentVideo = videos[currentIndex];

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

  const handleVideoError = useCallback((_error: Error) => {
    // Skip to next video on error
    goToNextVideo();
  }, [goToNextVideo]);

  // No announcements - show fallback
  if (!videos.length) {
    if (!showFallback) return null;

    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: PRIMARY_COLOR }}
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
        className={`w-full h-full transition-opacity duration-200 pointer-events-none ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {currentVideo && (
          <VimeoPlayerUniversal
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
            onAudioBlocked={handleAudioBlocked}
            className="w-full h-full"
          />
        )}
      </div>
    </div>
  );
}
