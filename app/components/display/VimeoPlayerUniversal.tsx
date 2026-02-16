'use client';

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

export interface VimeoPlayerUniversalProps {
  vimeoId: string;
  vimeoHash?: string | null;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  background?: boolean;
  volume?: number;
  onReady?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onAudioBlocked?: () => void;
  className?: string;
}

export interface VimeoPlayerUniversalHandle {
  // Simplified interface — imperative control not available via iframe postMessage
}

const VIMEO_ORIGIN = 'https://player.vimeo.com';

const VimeoPlayerUniversal = forwardRef<VimeoPlayerUniversalHandle, VimeoPlayerUniversalProps>(({
  vimeoId,
  vimeoHash,
  autoplay = true,
  muted = true,
  loop = false,
  controls = false,
  background = false,
  onReady,
  onEnded,
  onError,
  onAudioBlocked,
  className = '',
}, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const endedTriggeredRef = useRef(false);
  // Track playback progress from timeupdate events
  const progressRef = useRef({ seconds: 0, duration: 0, percent: 0 });
  // Track whether a 'play' event was received (for autoplay blocking detection)
  const playReceivedRef = useRef(false);
  const autoplayCheckRef = useRef<NodeJS.Timeout | null>(null);
  // Polling interval for getDuration/getCurrentTime fallback
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Store callbacks in refs to avoid re-registering the message listener
  const callbacksRef = useRef({ onReady, onEnded, onError, onAudioBlocked });
  callbacksRef.current = { onReady, onEnded, onError, onAudioBlocked };

  useImperativeHandle(ref, () => ({}), []);

  // Trigger ended only when confirmed near the end
  const triggerEnded = useCallback(() => {
    if (endedTriggeredRef.current) return;
    endedTriggeredRef.current = true;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    callbacksRef.current.onEnded?.();
  }, []);

  // Send a postMessage command to our iframe
  const postCommand = useCallback((method: string, value?: unknown) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    const msg: Record<string, unknown> = { method };
    if (value !== undefined) msg.value = value;
    iframe.contentWindow.postMessage(JSON.stringify(msg), VIMEO_ORIGIN);
  }, []);

  // Build Vimeo player URL with all params
  const buildSrc = useCallback(() => {
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      muted: muted ? '1' : '0',
      loop: loop ? '1' : '0',
      controls: controls ? '1' : '0',
      background: background ? '1' : '0',
      dnt: '1',
      // Enable the postMessage API for event listening
      api: '1',
    });

    if (vimeoHash) {
      params.set('h', vimeoHash);
    }

    return `${VIMEO_ORIGIN}/video/${vimeoId}?${params.toString()}`;
  }, [vimeoId, vimeoHash, autoplay, muted, loop, controls, background]);

  // Subscribe to Vimeo events via postMessage after iframe loads
  const subscribeToEvents = useCallback(() => {
    const events = ['ended', 'play', 'pause', 'timeupdate', 'playProgress'];
    for (const evt of events) {
      postCommand('addEventListener', evt);
    }
  }, [postCommand]);

  // Start polling for progress via method calls (fallback for timeupdate)
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(() => {
      if (endedTriggeredRef.current) return;
      postCommand('getCurrentTime');
      postCommand('getDuration');
    }, 1000);
  }, [postCommand]);

  // Listen for postMessage events from Vimeo iframe
  useEffect(() => {
    endedTriggeredRef.current = false;
    progressRef.current = { seconds: 0, duration: 0, percent: 0 };
    playReceivedRef.current = false;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== VIMEO_ORIGIN) return;

      // CRITICAL: Only process messages from OUR iframe, not other Vimeo iframes on the page
      // (e.g. AnnouncementZone also has Vimeo players that send postMessage events)
      if (event.source !== iframeRef.current?.contentWindow) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        if (data.event === 'ready') {
          callbacksRef.current.onReady?.();
          subscribeToEvents();
          startPolling();

          // Autoplay blocking detection: if not muted and autoplay is requested,
          // check if 'play' fires within 2 seconds
          if (autoplay && !muted) {
            autoplayCheckRef.current = setTimeout(() => {
              if (!playReceivedRef.current && !endedTriggeredRef.current) {
                // Autoplay with sound was likely blocked — mute and retry
                postCommand('setMuted', true);
                postCommand('play');
                callbacksRef.current.onAudioBlocked?.();
              }
            }, 2000);
          }
        } else if (data.event === 'play') {
          playReceivedRef.current = true;
        } else if (data.event === 'timeupdate' && data.data) {
          // Track playback progress from timeupdate events
          const { seconds, duration, percent } = data.data;
          progressRef.current = {
            seconds: seconds ?? 0,
            duration: duration ?? 0,
            percent: percent ?? 0,
          };
          if (duration > 0 && (percent > 0.99 || (duration - seconds) < 0.5)) {
            triggerEnded();
          }
        } else if (data.event === 'playProgress' && data.data) {
          // Vimeo postMessage API may send playProgress instead of timeupdate
          const { seconds, duration, percent } = data.data;
          progressRef.current = {
            seconds: seconds ?? 0,
            duration: duration ?? 0,
            percent: percent ?? 0,
          };
          if (duration > 0 && (percent > 0.99 || (duration - seconds) < 0.5)) {
            triggerEnded();
          }
        } else if (data.method === 'getCurrentTime' && typeof data.value === 'number') {
          // Response to polling getCurrentTime
          progressRef.current.seconds = data.value;
          // Check end if we have duration
          const { duration } = progressRef.current;
          if (duration > 0) {
            const percent = data.value / duration;
            progressRef.current.percent = percent;
            if (percent > 0.99 || (duration - data.value) < 0.5) {
              triggerEnded();
            }
          }
        } else if (data.method === 'getDuration' && typeof data.value === 'number') {
          // Response to polling getDuration
          progressRef.current.duration = data.value;
        } else if (data.event === 'ended') {
          // Only trust 'ended' if progress confirms we're near the end
          const { percent, duration } = progressRef.current;
          if (duration > 0 && percent > 0.9) {
            triggerEnded();
          }
          // If no progress data (duration === 0), ignore — rely on polling fallback
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (autoplayCheckRef.current) {
        clearTimeout(autoplayCheckRef.current);
        autoplayCheckRef.current = null;
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [vimeoId, vimeoHash, autoplay, muted, subscribeToEvents, startPolling, triggerEnded, postCommand]);

  const handleIframeLoad = useCallback(() => {
    // Fallback: if postMessage 'ready' event doesn't fire (some Smart TVs),
    // trigger ready from the iframe onLoad event
    subscribeToEvents();
    startPolling();
  }, [subscribeToEvents, startPolling]);

  const handleIframeError = useCallback(() => {
    callbacksRef.current.onError?.(new Error('Failed to load Vimeo player iframe'));
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src={buildSrc()}
      className={`w-full h-full ${className}`}
      style={{ border: 'none' }}
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
      allowFullScreen
      onLoad={handleIframeLoad}
      onError={handleIframeError}
    />
  );
});

VimeoPlayerUniversal.displayName = 'VimeoPlayerUniversal';

export default VimeoPlayerUniversal;
