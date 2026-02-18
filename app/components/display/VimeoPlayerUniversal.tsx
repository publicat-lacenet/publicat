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
  volume,
  onReady,
  onEnded,
  onError,
  onAudioBlocked,
  className = '',
}, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const endedTriggeredRef = useRef(false);
  // Track playback progress — maxDuration prevents false positives from buffering
  const progressRef = useRef({ seconds: 0, duration: 0, percent: 0 });
  const maxDurationRef = useRef(0);
  // Track whether a 'play' event was received (for autoplay blocking detection)
  const playReceivedRef = useRef(false);
  const readyReceivedRef = useRef(false);
  const autoplayCheckRef = useRef<NodeJS.Timeout | null>(null);
  // Guard to prevent double subscription to Vimeo events
  const subscribedRef = useRef(false);
  // Stall detection: if no events arrive after iframe load
  const stallCheckRef = useRef<NodeJS.Timeout | null>(null);
  const stallRetryRef = useRef<NodeJS.Timeout | null>(null);
  // Polling interval for getDuration/getCurrentTime fallback
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Store callbacks in refs to avoid re-registering the message listener
  const callbacksRef = useRef({ onReady, onEnded, onError, onAudioBlocked });
  callbacksRef.current = { onReady, onEnded, onError, onAudioBlocked };

  useImperativeHandle(ref, () => ({}), []);

  // Check if progress confirms we are truly near the end
  const isConfirmedNearEnd = useCallback(() => {
    const { seconds, duration } = progressRef.current;
    const maxDur = maxDurationRef.current;
    // Use the largest duration we've ever seen to avoid buffering false positives
    const trueDuration = Math.max(duration, maxDur);
    if (trueDuration <= 0) return false;
    const percent = seconds / trueDuration;
    return percent > 0.95 || (trueDuration - seconds) < 1;
  }, []);

  // Trigger ended only when confirmed near the end
  const triggerEnded = useCallback(() => {
    if (endedTriggeredRef.current) return;
    if (!isConfirmedNearEnd()) {
      console.log(`[VimeoUniversal] triggerEnded skipped — not near end (${progressRef.current.seconds.toFixed(1)}/${maxDurationRef.current.toFixed(1)})`);
      return;
    }
    console.log(`[VimeoUniversal] triggerEnded confirmed — advancing`);
    endedTriggeredRef.current = true;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    callbacksRef.current.onEnded?.();
  }, [isConfirmedNearEnd]);

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
      api: '1',
    });

    if (vimeoHash) {
      params.set('h', vimeoHash);
    }

    return `${VIMEO_ORIGIN}/video/${vimeoId}?${params.toString()}`;
  }, [vimeoId, vimeoHash, autoplay, muted, loop, controls, background]);

  // Subscribe to Vimeo events via postMessage after iframe loads
  const subscribeToEvents = useCallback(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;
    const events = ['ended', 'play', 'pause', 'timeupdate', 'playProgress', 'finish'];
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
    maxDurationRef.current = 0;
    playReceivedRef.current = false;
    readyReceivedRef.current = false;
    subscribedRef.current = false;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== VIMEO_ORIGIN) return;

      // CRITICAL: Only process messages from OUR iframe, not other Vimeo iframes
      // on the page (e.g. AnnouncementZone also has Vimeo players)
      if (event.source !== iframeRef.current?.contentWindow) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        if (data.event === 'ready') {
          readyReceivedRef.current = true;
          console.log(`[VimeoUniversal ${vimeoId}] ready`);
          callbacksRef.current.onReady?.();
          subscribeToEvents();
          startPolling();

          // Set volume if specified (normalize 0-100 → 0.0-1.0)
          if (volume !== undefined) {
            postCommand('setVolume', volume / 100);
          }

          // Autoplay blocking detection: if not muted and autoplay is requested,
          // check if 'play' fires within 2 seconds
          if (autoplay && !muted) {
            autoplayCheckRef.current = setTimeout(() => {
              if (!playReceivedRef.current && !endedTriggeredRef.current) {
                console.log(`[VimeoUniversal ${vimeoId}] autoplay blocked — muting and retrying`);
                // Autoplay with sound was likely blocked — mute and retry
                postCommand('setMuted', true);
                postCommand('play');
                callbacksRef.current.onAudioBlocked?.();
              }
            }, 2000);
          }
        } else if (data.event === 'play') {
          playReceivedRef.current = true;
          console.log(`[VimeoUniversal ${vimeoId}] play`);
        } else if ((data.event === 'timeupdate' || data.event === 'playProgress') && data.data) {
          // Track playback progress
          const { seconds, duration, percent } = data.data;
          const s = seconds ?? 0;
          const d = duration ?? 0;
          const p = percent ?? 0;
          progressRef.current = { seconds: s, duration: d, percent: p };
          if (d > maxDurationRef.current) {
            maxDurationRef.current = d;
          }
          if (d > 0 && (p > 0.99 || (d - s) < 0.5)) {
            triggerEnded();
          }
        } else if (data.method === 'getCurrentTime' && typeof data.value === 'number') {
          // Response to polling getCurrentTime
          progressRef.current.seconds = data.value;
          const trueDur = Math.max(progressRef.current.duration, maxDurationRef.current);
          if (trueDur > 0) {
            progressRef.current.percent = data.value / trueDur;
            if (data.value / trueDur > 0.99 || (trueDur - data.value) < 0.5) {
              triggerEnded();
            }
          }
        } else if (data.method === 'getDuration' && typeof data.value === 'number') {
          // Response to polling getDuration
          progressRef.current.duration = data.value;
          if (data.value > maxDurationRef.current) {
            maxDurationRef.current = data.value;
          }
        } else if (data.event === 'ended' || data.event === 'finish') {
          // Vimeo sends 'finish' (not 'ended') via postMessage API
          triggerEnded();
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
      if (stallCheckRef.current) {
        clearTimeout(stallCheckRef.current);
        stallCheckRef.current = null;
      }
      if (stallRetryRef.current) {
        clearTimeout(stallRetryRef.current);
        stallRetryRef.current = null;
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
    console.log(`[VimeoUniversal ${vimeoId}] iframe onLoad`);
    subscribeToEvents();
    startPolling();

    // Set volume in iframe load fallback too (for Smart TVs where 'ready' doesn't fire)
    if (volume !== undefined) {
      postCommand('setVolume', volume / 100);
    }

    // Stall detection: if no ready/play event arrives within 5s of iframe load,
    // the player may be completely stuck (common on display devices with no user interaction)
    if (stallCheckRef.current) clearTimeout(stallCheckRef.current);
    stallCheckRef.current = setTimeout(() => {
      if (endedTriggeredRef.current) return;
      if (!readyReceivedRef.current && !playReceivedRef.current) {
        console.warn(`[VimeoUniversal ${vimeoId}] stall detected — no ready/play after 5s, trying mute+play`);
        postCommand('setMuted', true);
        postCommand('play');
        callbacksRef.current.onAudioBlocked?.();

        // Second check: if still no play after another 5s, report error
        stallRetryRef.current = setTimeout(() => {
          if (endedTriggeredRef.current) return;
          if (!playReceivedRef.current) {
            console.error(`[VimeoUniversal ${vimeoId}] stall unrecoverable — reporting error`);
            callbacksRef.current.onError?.(new Error('Vimeo player stalled: no response after 10s'));
          }
        }, 5000);
      }
    }, 5000);
  }, [vimeoId, volume, subscribeToEvents, startPolling, postCommand]);

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
