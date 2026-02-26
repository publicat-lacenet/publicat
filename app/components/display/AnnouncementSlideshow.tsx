'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

export interface SlideshowVideo {
  id: string;
  title: string;
  frames_urls?: string[];
  thumbnail_url?: string | null;
}

const PRIMARY_COLOR = '#FEDD2C';

interface AnnouncementSlideshowProps {
  videos: SlideshowVideo[];
  intervalSeconds?: number;
  centerLogo?: string | null;
  showFallback?: boolean;
}

export default function AnnouncementSlideshow({
  videos,
  intervalSeconds = 4,
  centerLogo,
  showFallback = true,
}: AnnouncementSlideshowProps) {
  // Construir llista plana de frames de tots els vídeos:
  // [video1_frame0, video1_frame1, ..., video2_frame0, ...]
  // Si un vídeo no té frames, usar thumbnail com a frame únic (o saltar)
  const allFrames = buildFrameList(videos);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reiniciar índex si el nombre de frames canvia (evita out-of-bounds)
  useEffect(() => {
    setCurrentIndex(0);
    setVisible(true);
  }, [allFrames.length]);

  useEffect(() => {
    if (allFrames.length <= 1) return;

    timerRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % allFrames.length);
        setVisible(true);
      }, 300);
    }, intervalSeconds * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [allFrames.length, intervalSeconds]);

  // No hi ha frames — mostrar fallback
  if (allFrames.length === 0) {
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

  const safeIndex = allFrames.length > 0 ? currentIndex % allFrames.length : 0;
  const currentFrame = allFrames[safeIndex];

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div
        className="w-full h-full transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {currentFrame && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentFrame}
            alt=""
            className="w-full h-full object-contain"
            draggable={false}
          />
        )}
      </div>
    </div>
  );
}

function buildFrameList(videos: SlideshowVideo[]): string[] {
  const frames: string[] = [];

  for (const video of videos) {
    if (video.frames_urls && video.frames_urls.length > 0) {
      frames.push(...video.frames_urls);
    } else if (video.thumbnail_url) {
      frames.push(video.thumbnail_url);
    }
    // Si no té cap recurs visual, saltar el vídeo
  }

  return frames;
}
