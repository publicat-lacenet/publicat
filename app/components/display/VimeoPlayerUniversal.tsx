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
  // Track playback progress — maxDuration prevents false positives from buffering
  const progressRef = useRef({ seconds: 0, duration: 0, percent: 0 });
  const maxDurationRef = useRef(0);
  // Track whether a 'play' event was received (for autoplay blocking detection)
  const playReceivedRef = useRef(false);
  const autoplayCheckRef = useRef<NodeJS.Timeout | null>(null);
  // Polling interval for getDuration/getCurrentTime fallback
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  // Mount time for logging
  const mountTimeRef = useRef(Date.now());

  // Store callbacks in refs to avoid re-registering the message listener
  const callbacksRef = useRef({ onReady, onEnded, onError, onAudioBlocked });
  callbacksRef.current = { onReady, onEnded, onError, onAudioBlocked };

  useImperativeHandle(ref, () => ({}), []);

  const log = useCallback((msg: string, data?: unknown) => {
    const elapsed = ((Date.now() - mountTimeRef.current) / 1000).toFixed(1);
    const prefix = `[VPU ${vimeoId} +${elapsed}s]`;
    if (data !== undefined) {
      console.log(prefix, msg, data);
    } else {
      console.log(prefix, msg);
    }
  }, [vimeoId]);

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
  const triggerEnded = useCallback((source: string) => {
    if (endedTriggeredRef.current) return;
    const { seconds, duration } = progressRef.current;
    const maxDur = maxDurationRef.current;
    log(`triggerEnded called from "${source}" — seconds=${seconds.toFixed(1)}, duration=${duration.toFixed(1)}, maxDuration=${maxDur.toFixed(1)}`);
    if (!isConfirmedNearEnd()) {
      log(`BLOCKED — not near end (using maxDuration=${maxDur.toFixed(1)})`);
      return;
    }
    endedTriggeredRef.current = true;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    log('VIDEO ENDED — advancing to next');
    callbacksRef.current.onEnded?.();
  }, [log, isConfirmedNearEnd]);

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
    mountTimeRef.current = Date.now();

    log('Effect setup — listening for messages');

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== VIMEO_ORIGIN) return;

      // CRITICAL: Only process messages from OUR iframe, not other Vimeo iframes on the page
      if (event.source !== iframeRef.current?.contentWindow) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        // Log ALL events (throttle timeupdate/playProgress to every ~10s)
        const eventName = data.event || data.method || 'unknown';
        if (eventName !== 'timeupdate' && eventName !== 'playProgress'
            && eventName !== 'getCurrentTime' && eventName !== 'getDuration') {
          log(`event: ${eventName}`, data);
        }

        if (data.event === 'ready') {
          callbacksRef.current.onReady?.();
          subscribeToEvents();
          startPolling();

          if (autoplay && !muted) {
            autoplayCheckRef.current = setTimeout(() => {
              if (!playReceivedRef.current && !endedTriggeredRef.current) {
                log('Autoplay with sound blocked — muting and retrying');
                postCommand('setMuted', true);
                postCommand('play');
                callbacksRef.current.onAudioBlocked?.();
              }
            }, 2000);
          }
        } else if (data.event === 'play') {
          playReceivedRef.current = true;
        } else if ((data.event === 'timeupdate' || data.event === 'playProgress') && data.data) {
          const { seconds, duration, percent } = data.data;
          const s = seconds ?? 0;
          const d = duration ?? 0;
          const p = percent ?? 0;
          progressRef.current = { seconds: s, duration: d, percent: p };
          if (d > maxDurationRef.current) {
            maxDurationRef.current = d;
            log(`Duration updated: ${d.toFixed(1)}s`);
          }
          // Log progress every ~10 seconds
          if (Math.floor(s) % 10 === 0 && s > 0 && Math.floor(s) !== Math.floor(s - 0.3)) {
            log(`Progress: ${s.toFixed(1)}/${d.toFixed(1)}s (${(p * 100).toFixed(1)}%)`);
          }
          if (d > 0 && (p > 0.99 || (d - s) < 0.5)) {
            triggerEnded('timeupdate/playProgress event');
          }
        } else if (data.method === 'getCurrentTime' && typeof data.value === 'number') {
          progressRef.current.seconds = data.value;
          const maxDur = maxDurationRef.current;
          const dur = progressRef.current.duration;
          const trueDur = Math.max(dur, maxDur);
          if (trueDur > 0) {
            const pct = data.value / trueDur;
            progressRef.current.percent = pct;
            if (pct > 0.99 || (trueDur - data.value) < 0.5) {
              triggerEnded('getCurrentTime polling');
            }
          }
        } else if (data.method === 'getDuration' && typeof data.value === 'number') {
          progressRef.current.duration = data.value;
          if (data.value > maxDurationRef.current) {
            maxDurationRef.current = data.value;
            log(`Duration (polling): ${data.value.toFixed(1)}s`);
          }
        } else if (data.event === 'ended' || data.event === 'finish') {
          log(`"${data.event}" event received — checking progress...`);
          triggerEnded(`${data.event} event`);
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      log('Effect cleanup');
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
  }, [vimeoId, vimeoHash, autoplay, muted, subscribeToEvents, startPolling, triggerEnded, postCommand, log]);

  const handleIframeLoad = useCallback(() => {
    log('iframe onLoad fired');
    subscribeToEvents();
    startPolling();
  }, [subscribeToEvents, startPolling, log]);

  const handleIframeError = useCallback(() => {
    log('iframe onError fired!');
    callbacksRef.current.onError?.(new Error('Failed to load Vimeo player iframe'));
  }, [log]);

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
