'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import VimeoPlayer from './VimeoPlayer';
import VimeoPlayerUniversal from './VimeoPlayerUniversal';

export interface DisplayVideo {
  id: string;
  title: string;
  vimeo_id: string;
  vimeo_hash?: string | null;
  duration_seconds?: number | null;
  thumbnail_url?: string | null;
}

interface VideoZoneProps {
  videos: DisplayVideo[];
  initialIndex?: number;
  showTitle?: boolean;
  titleDuration?: number;
  muted?: boolean;
  useUniversalPlayer?: boolean;
  onVideoChange?: (index: number, video: DisplayVideo) => void;
  onPlaylistEnd?: () => void;
  onError?: (error: Error, video: DisplayVideo) => void;
  onAudioBlocked?: () => void;
}

export default function VideoZone({
  videos,
  initialIndex = 0,
  showTitle = true,
  titleDuration = 5000,
  muted = true,
  useUniversalPlayer = false,
  onVideoChange,
  onPlaylistEnd,
  onError,
  onAudioBlocked,
}: VideoZoneProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isShowingTitle, setIsShowingTitle] = useState(showTitle);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorCountRef = useRef(0);

  const currentVideo = videos[currentIndex];

  // Reset title visibility when video changes
  useEffect(() => {
    if (showTitle && currentVideo) {
      setIsShowingTitle(true);

      titleTimeoutRef.current = setTimeout(() => {
        setIsShowingTitle(false);
      }, titleDuration);
    }

    return () => {
      if (titleTimeoutRef.current) {
        clearTimeout(titleTimeoutRef.current);
      }
    };
  }, [currentIndex, showTitle, titleDuration, currentVideo]);

  // Notify parent of video change
  useEffect(() => {
    if (currentVideo) {
      onVideoChange?.(currentIndex, currentVideo);
    }
  }, [currentIndex, currentVideo, onVideoChange]);

  const goToNextVideo = useCallback(() => {
    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;

        if (nextIndex >= videos.length) {
          // End of playlist, restart from beginning
          onPlaylistEnd?.();
          errorCountRef.current = 0;
          return 0;
        }

        return nextIndex;
      });

      setIsTransitioning(false);
    }, 300); // Fade transition duration
  }, [videos.length, onPlaylistEnd]);

  const handleVideoEnd = useCallback(() => {
    console.log(`[VideoZone] handleVideoEnd — video ${currentIndex + 1}/${videos.length}: "${currentVideo?.title}"`);
    errorCountRef.current = 0;
    goToNextVideo();
  }, [goToNextVideo, currentIndex, videos.length, currentVideo]);

  const handleVideoError = useCallback((error: Error) => {
    console.error(`[VideoZone] handleVideoError — video ${currentIndex + 1}/${videos.length}: "${currentVideo?.title}"`, error);
    onError?.(error, currentVideo);

    errorCountRef.current += 1;

    // Skip to next video if this one fails
    // But if we've had too many consecutive errors, stop to prevent infinite loop
    if (errorCountRef.current < videos.length) {
      goToNextVideo();
    }
  }, [currentVideo, currentIndex, videos.length, onError, goToNextVideo]);

  // No videos to display
  if (!videos.length || !currentVideo) {
    return null;
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
      {/* Video Player - centrat verticalment amb aspect ratio 16:9 */}
      <div
        className={`w-full max-h-full aspect-video transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {useUniversalPlayer ? (
          <VimeoPlayerUniversal
            key={currentVideo.id}
            vimeoId={currentVideo.vimeo_id}
            vimeoHash={currentVideo.vimeo_hash}
            autoplay={true}
            muted={muted}
            loop={videos.length === 1}
            controls={false}
            background={false}
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            onAudioBlocked={onAudioBlocked}
            className="w-full h-full"
          />
        ) : (
          <VimeoPlayer
            key={currentVideo.id}
            vimeoId={currentVideo.vimeo_id}
            vimeoHash={currentVideo.vimeo_hash}
            autoplay={true}
            muted={muted}
            loop={videos.length === 1}
            controls={false}
            background={false}
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            onAudioBlocked={onAudioBlocked}
            className="w-full h-full"
          />
        )}
      </div>

      {/* Title Overlay */}
      {showTitle && (
        <div
          className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-500 ${
            isShowingTitle ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <h2 className="text-2xl font-semibold text-white drop-shadow-lg">
            {currentVideo.title}
          </h2>
          {videos.length > 1 && (
            <p className="text-sm text-white/70 mt-1">
              {currentIndex + 1} / {videos.length}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
