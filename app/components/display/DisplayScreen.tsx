'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import DisplayLayout from './DisplayLayout';
import DisplayHeader from './DisplayHeader';
import VideoZone, { DisplayVideo } from './VideoZone';
import AnnouncementZone, { AnnouncementVideo } from './AnnouncementZone';
import RSSZone from './RSSZone';
import TickerBar from './TickerBar';
import StandbyScreen from './StandbyScreen';

interface DisplayConfig {
  center: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  current_playlist: {
    id: string;
    name: string;
    kind: string;
    video_count: number;
  } | null;
  announcements_playlist: {
    id: string;
    name: string;
    video_count: number;
  } | null;
  rss_settings: {
    seconds_per_item: number;
    seconds_per_feed: number;
  };
  display_settings: {
    show_header: boolean;
    show_clock: boolean;
    show_ticker: boolean;
    ticker_speed: number;
    standby_message: string;
    announcement_volume: number;
  };
}

interface DisplayScreenProps {
  centerId: string;
  playlistOverride?: string;
  /** Use w-full h-full instead of w-screen h-screen (for embedded preview) */
  embedded?: boolean;
}

export default function DisplayScreen({
  centerId,
  playlistOverride,
  embedded = false,
}: DisplayScreenProps) {
  const sizeClass = embedded ? 'w-full h-full' : 'w-screen h-screen';
  const searchParams = useSearchParams();
  const useUniversalPlayer = searchParams.get('player') !== 'sdk';
  const [config, setConfig] = useState<DisplayConfig | null>(null);
  const [mainVideos, setMainVideos] = useState<DisplayVideo[]>([]);
  const [announcementVideos, setAnnouncementVideos] = useState<AnnouncementVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // For non-embedded displays, try audio enabled by default
  const [audioEnabled, setAudioEnabled] = useState(!embedded);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch display config
  const fetchConfig = useCallback(async () => {
    try {
      const params = new URLSearchParams({ centerId });
      if (playlistOverride) {
        params.append('playlist', playlistOverride);
      }

      const response = await fetch(`/api/display/config?${params}`);

      if (!response.ok) {
        throw new Error('Error fetching display config');
      }

      const data: DisplayConfig = await response.json();
      setConfig(data);
      return data;
    } catch (err) {
      console.error('Error fetching config:', err);
      setError('Error carregant la configuració');
      throw err;
    }
  }, [centerId, playlistOverride]);

  // Fetch playlist videos
  const fetchPlaylistVideos = useCallback(async (playlistId: string): Promise<DisplayVideo[]> => {
    try {
      const response = await fetch(`/api/display/playlist/${playlistId}`);

      if (!response.ok) {
        throw new Error('Error fetching playlist');
      }

      const data = await response.json();
      return data.videos || [];
    } catch (err) {
      console.error('Error fetching playlist:', err);
      return [];
    }
  }, []);

  // Initial load
  useEffect(() => {
    async function loadDisplay() {
      setIsLoading(true);
      setError(null);

      try {
        const displayConfig = await fetchConfig();

        // Fetch main playlist videos
        if (displayConfig.current_playlist?.id) {
          const videos = await fetchPlaylistVideos(displayConfig.current_playlist.id);
          setMainVideos(videos);
        }

        // Fetch announcement videos
        if (displayConfig.announcements_playlist?.id) {
          const videos = await fetchPlaylistVideos(displayConfig.announcements_playlist.id);
          setAnnouncementVideos(videos);
        }

        setIsLoading(false);
      } catch {
        setIsLoading(false);
      }
    }

    loadDisplay();
  }, [fetchConfig, fetchPlaylistVideos]);

  // Hide cursor after inactivity
  useEffect(() => {
    const hideCursor = () => {
      if (containerRef.current) {
        containerRef.current.style.cursor = 'none';
      }
    };

    const showCursor = () => {
      if (containerRef.current) {
        containerRef.current.style.cursor = 'default';
      }

      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }

      cursorTimeoutRef.current = setTimeout(hideCursor, 3000);
    };

    // Initial hide after 3 seconds
    cursorTimeoutRef.current = setTimeout(hideCursor, 3000);

    // Show cursor on mouse move
    const container = containerRef.current;
    container?.addEventListener('mousemove', showCursor);

    return () => {
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      container?.removeEventListener('mousemove', showCursor);
    };
  }, []);

  // Fullscreen on F11 or click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`${sizeClass} bg-black flex items-center justify-center`}>
        <div className="text-white text-xl">Carregant...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${sizeClass} bg-black flex items-center justify-center`}>
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  // No config
  if (!config) {
    return (
      <div className={`${sizeClass} bg-black flex items-center justify-center`}>
        <div className="text-gray-500 text-xl">Configuració no disponible</div>
      </div>
    );
  }

  const { display_settings, rss_settings, center } = config;

  // Standby if no main videos
  if (mainVideos.length === 0) {
    return (
      <div ref={containerRef} className={sizeClass} onDoubleClick={toggleFullscreen}>
        <StandbyScreen
          message={display_settings.standby_message}
          centerLogo={center.logo_url}
          centerName={center.name}
        />
      </div>
    );
  }

  const handleEnableAudio = () => {
    setAudioBlocked(false);
    setAudioEnabled(true);
  };

  return (
    <div ref={containerRef} className={sizeClass} onDoubleClick={toggleFullscreen}>
      <DisplayLayout
        showHeader={display_settings.show_header}
        headerContent={
          display_settings.show_header ? (
            <DisplayHeader
              centerLogo={center.logo_url}
              centerName={center.name}
              showClock={display_settings.show_clock}
            />
          ) : undefined
        }
        mainZone={
          <VideoZone
            videos={mainVideos}
            showTitle={true}
            titleDuration={5000}
            muted={embedded || !audioEnabled}
            useUniversalPlayer={useUniversalPlayer}
            onAudioBlocked={() => {
              // Browser blocked autoplay with sound, fallback to muted
              setAudioBlocked(true);
              setAudioEnabled(false);
            }}
          />
        }
        announcementZone={
          announcementVideos.length > 0 ? (
            <AnnouncementZone
              videos={announcementVideos}
              volume={display_settings.announcement_volume}
              showFallback={true}
              centerLogo={center.logo_url}
            />
          ) : undefined
        }
        rssZone={
          <RSSZone
            centerId={center.id}
            secondsPerItem={rss_settings.seconds_per_item}
            secondsPerFeed={rss_settings.seconds_per_feed}
          />
        }
        tickerZone={
          <TickerBar
            centerId={center.id}
            speed={display_settings.ticker_speed}
          />
        }
      />

      {/* Audio enable button - only show if browser blocked autoplay with sound */}
      {!embedded && audioBlocked && !audioEnabled && (
        <button
          onClick={handleEnableAudio}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-white/90 hover:bg-white text-gray-900 rounded-lg shadow-lg transition-all hover:scale-105"
          title="Activar àudio"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
          <span className="font-medium">Activar àudio</span>
        </button>
      )}
    </div>
  );
}
