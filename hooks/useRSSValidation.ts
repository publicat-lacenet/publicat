import { useState, useCallback, useRef, useEffect } from 'react';

interface RSSPreviewItem {
  title: string;
  description: string | null;
  link: string | null;
  pub_date: string | null;
  image_url: string | null;
}

interface RSSValidationState {
  status: 'idle' | 'validating' | 'valid' | 'error';
  feedTitle: string | null;
  itemCount: number | null;
  preview: RSSPreviewItem[];
  error: string | null;
  errorType: string | null;
}

const DEBOUNCE_MS = 500;

export function useRSSValidation() {
  const [state, setState] = useState<RSSValidationState>({
    status: 'idle',
    feedTitle: null,
    itemCount: null,
    preview: [],
    error: null,
    errorType: null,
  });

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const validate = useCallback(async (url: string) => {
    // Cancel previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!url || url.trim() === '') {
      setState({
        status: 'idle',
        feedTitle: null,
        itemCount: null,
        preview: [],
        error: null,
        errorType: null,
      });
      return;
    }

    // Set validating immediately for UX feedback
    setState(prev => ({ ...prev, status: 'validating', error: null, errorType: null }));

    // Debounce the actual API call
    debounceRef.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController();

      try {
        const res = await fetch('/api/rss/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
          signal: abortControllerRef.current.signal,
        });

        const data = await res.json();

        if (data.valid) {
          setState({
            status: 'valid',
            feedTitle: data.feed_title,
            itemCount: data.item_count,
            preview: data.preview || [],
            error: null,
            errorType: null,
          });
        } else {
          setState({
            status: 'error',
            feedTitle: null,
            itemCount: null,
            preview: [],
            error: data.message || 'Error validant el feed',
            errorType: data.error || 'UNKNOWN_ERROR',
          });
        }
      } catch (error: any) {
        // Ignore abort errors
        if (error.name === 'AbortError') {
          return;
        }

        setState({
          status: 'error',
          feedTitle: null,
          itemCount: null,
          preview: [],
          error: 'Error de connexió',
          errorType: 'CONNECTION_ERROR',
        });
      }
    }, DEBOUNCE_MS);
  }, []);

  const reset = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState({
      status: 'idle',
      feedTitle: null,
      itemCount: null,
      preview: [],
      error: null,
      errorType: null,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    state,
    validate,
    reset,
  };
}

export type { RSSValidationState, RSSPreviewItem };
