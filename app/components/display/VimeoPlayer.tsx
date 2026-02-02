'use client';

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import Player from '@vimeo/player';
import { extractVimeoIdAndHash } from '@/lib/vimeo';

export interface VimeoPlayerProps {
  vimeoId: string;
  vimeoHash?: string | null;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  background?: boolean;
  volume?: number;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onAudioBlocked?: () => void;
  onTimeUpdate?: (data: { seconds: number; percent: number; duration: number }) => void;
  className?: string;
}

export interface VimeoPlayerHandle {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  setMuted: (muted: boolean) => Promise<void>;
  getCurrentTime: () => Promise<number>;
  getDuration: () => Promise<number>;
}

const VimeoPlayer = forwardRef<VimeoPlayerHandle, VimeoPlayerProps>(({
  vimeoId,
  vimeoHash,
  autoplay = false,
  muted = false,
  loop = false,
  controls = false,
  background = false,
  volume,
  onReady,
  onPlay,
  onPause,
  onEnded,
  onError,
  onAudioBlocked,
  onTimeUpdate,
  className = '',
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const endedTriggeredRef = useRef(false);
  const isDestroyedRef = useRef(false);

  // Store callbacks in refs to avoid re-initialization
  const callbacksRef = useRef({ onReady, onPlay, onPause, onEnded, onError, onAudioBlocked, onTimeUpdate });
  callbacksRef.current = { onReady, onPlay, onPause, onEnded, onError, onAudioBlocked, onTimeUpdate };

  // Expose imperative methods
  useImperativeHandle(ref, () => ({
    play: async () => {
      if (playerRef.current) {
        await playerRef.current.play();
      }
    },
    pause: async () => {
      if (playerRef.current) {
        await playerRef.current.pause();
      }
    },
    setVolume: async (vol: number) => {
      if (playerRef.current) {
        await playerRef.current.setVolume(vol / 100);
      }
    },
    setMuted: async (isMuted: boolean) => {
      if (playerRef.current) {
        await playerRef.current.setMuted(isMuted);
        // If unmuting, also set volume to ensure audio plays
        if (!isMuted) {
          await playerRef.current.setVolume(1);
        }
      }
    },
    getCurrentTime: async () => {
      if (playerRef.current) {
        return playerRef.current.getCurrentTime();
      }
      return 0;
    },
    getDuration: async () => {
      if (playerRef.current) {
        return playerRef.current.getDuration();
      }
      return 0;
    },
  }), []);

  const destroyPlayer = useCallback(() => {
    // Mark as destroyed FIRST to stop any async operations
    isDestroyedRef.current = true;

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch {
        // Ignore errors during destruction
      }
      playerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up any existing player
    destroyPlayer();
    endedTriggeredRef.current = false;
    isDestroyedRef.current = false;

    // Extract numeric ID and hash
    const extracted = extractVimeoIdAndHash(vimeoId);
    const numericId = extracted?.id || vimeoId;
    const effectiveHash = vimeoHash || extracted?.hash;

    const options: Record<string, unknown> = {
      autoplay,
      muted,
      loop,
      controls,
      background,
      responsive: true,
      dnt: true,
    };

    // For unlisted videos, use full URL with hash
    if (effectiveHash) {
      options.url = `https://vimeo.com/${numericId}/${effectiveHash}`;
    } else {
      options.id = parseInt(numericId, 10);
    }

    try {
      const player = new Player(containerRef.current, options);
      playerRef.current = player;

      // Set initial volume
      if (typeof volume === 'number') {
        player.setVolume(volume / 100);
      }

      // Register events
      player.on('loaded', () => {
        if (isDestroyedRef.current) return;
        callbacksRef.current.onReady?.();

        // Check if autoplay with sound was blocked
        if (autoplay && !muted) {
          // After a short delay, check if video is actually playing
          setTimeout(async () => {
            if (isDestroyedRef.current || !playerRef.current) return;
            try {
              const paused = await playerRef.current.getPaused();
              if (paused && !isDestroyedRef.current && playerRef.current) {
                // Autoplay was blocked — mute and retry playback so video starts
                await playerRef.current.setMuted(true);
                await playerRef.current.play().catch(() => {});
                // Notify parent so it can show the "enable audio" button
                callbacksRef.current.onAudioBlocked?.();
              }
            } catch (err) {
              // Ignore "Unknown player" errors
              const errorMsg = String(err);
              if (!errorMsg.includes('Unknown player') && !isDestroyedRef.current) {
                console.warn('VimeoPlayer autoplay check error:', err);
              }
            }
          }, 500);
        }
      });

      player.on('play', () => {
        callbacksRef.current.onPlay?.();
      });

      player.on('pause', () => {
        callbacksRef.current.onPause?.();
      });

      player.on('ended', () => {
        if (!endedTriggeredRef.current) {
          endedTriggeredRef.current = true;
          callbacksRef.current.onEnded?.();
        }
      });

      player.on('error', (err) => {
        // Ignore errors if player is being destroyed
        if (isDestroyedRef.current) return;

        const errorMsg = String(err);
        // Ignore "Unknown player" errors as they happen during normal cleanup
        if (errorMsg.includes('Unknown player')) return;

        callbacksRef.current.onError?.(new Error(errorMsg));
      });

      // Polling fallback to detect video end
      pollingRef.current = setInterval(async () => {
        // Check destroyed flag FIRST to avoid "Unknown player" errors
        if (isDestroyedRef.current || !playerRef.current || endedTriggeredRef.current) return;

        try {
          // Store reference locally to avoid race conditions
          const player = playerRef.current;
          if (!player || isDestroyedRef.current) return;

          // Double-check before each async call
          if (isDestroyedRef.current) return;
          const currentTime = await player.getCurrentTime();

          if (isDestroyedRef.current) return;
          const duration = await player.getDuration();

          // Check again after async operations
          if (isDestroyedRef.current) return;

          if (duration > 0) {
            const percent = currentTime / duration;

            // Callback for time update
            callbacksRef.current.onTimeUpdate?.({
              seconds: currentTime,
              percent,
              duration,
            });

            // Detect end (within last 0.5 seconds or >99%)
            if (percent > 0.99 || (duration - currentTime) < 0.5) {
              endedTriggeredRef.current = true;
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
              }
              callbacksRef.current.onEnded?.();
            }
          }
        } catch (err) {
          // Ignore "Unknown player" errors - they happen during normal cleanup
          const errorMsg = String(err);
          if (!errorMsg.includes('Unknown player') && !isDestroyedRef.current) {
            console.warn('VimeoPlayer polling error:', err);
          }
        }
      }, 1000);

    } catch (err) {
      callbacksRef.current.onError?.(err instanceof Error ? err : new Error(String(err)));
    }

    return () => {
      destroyPlayer();
    };
  // Note: muted is handled separately so player doesn't recreate on mute toggle
  }, [vimeoId, vimeoHash, autoplay, loop, controls, background, volume, destroyPlayer]);

  // Handle muted changes without recreating player
  useEffect(() => {
    const player = playerRef.current;
    if (player && !isDestroyedRef.current) {
      player.setMuted(muted).then(() => {
        // Re-check before next operation
        if (!muted && playerRef.current && !isDestroyedRef.current) {
          // When unmuting, ensure volume is audible
          playerRef.current.setVolume(1).catch(() => {
            // Ignore errors if player is being destroyed
          });
        }
      }).catch((err) => {
        // Ignore "Unknown player" errors
        const errorMsg = String(err);
        if (!errorMsg.includes('Unknown player') && !isDestroyedRef.current) {
          console.warn('VimeoPlayer muted change error:', err);
        }
      });
    }
  }, [muted]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
      data-vimeo-id={vimeoId}
    />
  );
});

VimeoPlayer.displayName = 'VimeoPlayer';

export default VimeoPlayer;
