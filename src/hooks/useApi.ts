import { useState, useCallback, useRef, useEffect } from 'react';
import type { LoadingState, ApiError } from '../types';
import { parseApiError, log } from '../utils';
import { CACHE_CONFIG } from '../constants';

// ==================== API FETCH HOOK ====================

interface UseApiOptions<T> {
  initialData?: T;
  cacheKey?: string;
  staleTime?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
}

interface UseApiResult<T> {
  data: T | null;
  error: ApiError | null;
  status: LoadingState;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  fetch: () => Promise<T | null>;
  refetch: () => Promise<T | null>;
  reset: () => void;
}

const cache = new Map<string, { data: unknown; timestamp: number }>();

export function useApi<T>(
  fetcher: () => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const {
    initialData = null,
    cacheKey,
    staleTime = CACHE_CONFIG.STALE_TIME,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<ApiError | null>(null);
  const [status, setStatus] = useState<LoadingState>('idle');
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (): Promise<T | null> => {
    // Check cache
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < staleTime) {
        setData(cached.data as T);
        setStatus('success');
        return cached.data as T;
      }
    }

    // Abort previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setStatus('loading');
    setError(null);

    let retries = CACHE_CONFIG.RETRY_COUNT;
    let lastError: ApiError | null = null;

    while (retries > 0) {
      try {
        const result = await fetcher();
        setData(result);
        setStatus('success');

        // Update cache
        if (cacheKey) {
          cache.set(cacheKey, { data: result, timestamp: Date.now() });
        }

        onSuccess?.(result);
        return result;
      } catch (err) {
        lastError = parseApiError(err);
        retries--;

        if (retries > 0) {
          const delay = CACHE_CONFIG.RETRY_DELAY * (CACHE_CONFIG.RETRY_COUNT - retries);
          log('warn', `Retrying in ${delay}ms...`, lastError);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    setError(lastError);
    setStatus('error');
    onError?.(lastError!);
    return null;
  }, [fetcher, cacheKey, staleTime, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setStatus('idle');
  }, [initialData]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    data,
    error,
    status,
    isLoading: status === 'loading',
    isError: status === 'error',
    isSuccess: status === 'success',
    fetch: fetchData,
    refetch: fetchData,
    reset,
  };
}

// ==================== CACHE INVALIDATION ====================

export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

export function getCacheKey(...parts: (string | number | undefined)[]): string {
  return parts.filter(Boolean).join(':');
}
