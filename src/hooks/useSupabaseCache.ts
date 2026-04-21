import { useEffect, useState } from "react";

/**
 * Tiny in-memory cache for Supabase queries.
 *
 * Why: route components were calling supabase on every mount, which made
 * tabs feel laggy (network round-trip on every nav). With this cache, the
 * second visit to a tab renders cached data INSTANTLY while a background
 * refetch keeps things fresh.
 *
 * Not a replacement for React Query — just a tiny SWR-style cache scoped to
 * the SPA session. Cleared on full page reload.
 */

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function getCached<T>(key: string): T | undefined {
  return cache.get(key)?.data as T | undefined;
}

export function setCached<T>(key: string, data: T) {
  cache.set(key, { data, fetchedAt: Date.now() });
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}

/**
 * useCachedQuery — call any async fetcher with a cache key.
 * - Returns cached data immediately on subsequent mounts.
 * - Always refetches in the background (after `staleMs`, default 30s).
 */
export function useCachedQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: { staleMs?: number } = {},
) {
  const { staleMs = 30_000 } = options;
  const [data, setData] = useState<T | undefined>(() =>
    key ? (cache.get(key)?.data as T | undefined) : undefined,
  );
  const [loading, setLoading] = useState<boolean>(() => {
    if (!key) return false;
    return !cache.has(key);
  });
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!key) {
      setData(undefined);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const cached = cache.get(key) as CacheEntry<T> | undefined;
    if (cached) {
      setData(cached.data);
      setLoading(false);
      // Skip background refresh if fresh
      if (Date.now() - cached.fetchedAt < staleMs) return;
    } else {
      setLoading(true);
    }

    let promise = inflight.get(key) as Promise<T> | undefined;
    if (!promise) {
      promise = fetcher();
      inflight.set(key, promise);
    }

    promise
      .then((result) => {
        cache.set(key, { data: result, fetchedAt: Date.now() });
        if (!cancelled) {
          setData(result);
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      })
      .finally(() => {
        inflight.delete(key);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading, error };
}
