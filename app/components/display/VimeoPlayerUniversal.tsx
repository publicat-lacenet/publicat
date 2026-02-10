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

  // Store callbacks in refs to avoid re-registering the message listener
  const callbacksRef = useRef({ onReady, onEnded, onError, onAudioBlocked });
  callbacksRef.current = { onReady, onEnded, onError, onAudioBlocked };

  useImperativeHandle(ref, () => ({}), []);

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
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    // Subscribe to the 'ended' event
    iframe.contentWindow.postMessage(
      JSON.stringify({ method: 'addEventListener', value: 'ended' }),
      VIMEO_ORIGIN
    );
    // Subscribe to the 'play' event (to detect autoplay blocking)
    iframe.contentWindow.postMessage(
      JSON.stringify({ method: 'addEventListener', value: 'play' }),
      VIMEO_ORIGIN
    );
  }, []);

  // Listen for postMessage events from Vimeo iframe
  useEffect(() => {
    endedTriggeredRef.current = false;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== VIMEO_ORIGIN) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        if (data.event === 'ready') {
          callbacksRef.current.onReady?.();
          // Subscribe to events once player is ready
          subscribeToEvents();
        } else if (data.event === 'ended' && !endedTriggeredRef.current) {
          endedTriggeredRef.current = true;
          callbacksRef.current.onEnded?.();
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [vimeoId, vimeoHash, subscribeToEvents]);

  const handleIframeLoad = useCallback(() => {
    // Fallback: if postMessage 'ready' event doesn't fire (some Smart TVs),
    // trigger ready from the iframe onLoad event
    // The subscribeToEvents will also be called from the 'ready' postMessage
    subscribeToEvents();
  }, [subscribeToEvents]);

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
