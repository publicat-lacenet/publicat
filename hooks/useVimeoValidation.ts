import { useState, useCallback } from 'react';

interface VimeoValidationState {
  status: 'idle' | 'validating' | 'valid' | 'error';
  videoId: string | null;
  thumbnail: string | null;
  title: string | null;
  duration: number | null;
  description: string | null;
  error: string | null;
}

export function useVimeoValidation() {
  const [state, setState] = useState<VimeoValidationState>({
    status: 'idle',
    videoId: null,
    thumbnail: null,
    title: null,
    duration: null,
    description: null,
    error: null,
  });

  const validate = useCallback(async (url: string) => {
    if (!url) {
      setState({
        status: 'idle',
        videoId: null,
        thumbnail: null,
        title: null,
        duration: null,
        description: null,
        error: null,
      });
      return;
    }

    setState(prev => ({ ...prev, status: 'validating', error: null }));

    try {
      const res = await fetch('/api/vimeo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (res.ok) {
        setState({
          status: 'valid',
          videoId: data.videoId,
          thumbnail: data.thumbnail,
          title: data.title,
          duration: data.duration,
          description: data.description,
          error: null,
        });
      } else {
        setState({
          status: 'error',
          videoId: null,
          thumbnail: null,
          title: null,
          duration: null,
          description: null,
          error: data.error || 'Error validant el vídeo',
        });
      }
    } catch (error) {
      setState({
        status: 'error',
        videoId: null,
        thumbnail: null,
        title: null,
        duration: null,
        description: null,
        error: 'Error de connexió amb Vimeo',
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      videoId: null,
      thumbnail: null,
      title: null,
      duration: null,
      description: null,
      error: null,
    });
  }, []);

  return {
    state,
    validate,
    reset,
  };
}
