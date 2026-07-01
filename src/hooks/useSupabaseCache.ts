import { useEffect, useState } from "react";

/**
 * Tiny SWR-style cache for Supabase queries, persisted to localStorage.
 *
 * - First mount: reads cached data from localStorage → renders INSTANTLY.
 * - Background: refetches if stale, updates cache + UI when it lands.
 * - Second launch of the app: still instant, no white screen.
 *
 * Persistence is critical for the native APK: previously every cold start
 * hit the network for categories/products before showing anything.
 */

type CacheEntry<T> = { data: T; fetchedAt: number };

const MEM = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const LS_PREFIX = "spk-cache:";

function lsGet<T>(key: string): CacheEntry<T> | undefined {
  try {
    const raw = typeof localStorage !== "undefined" && localStorage.getItem(LS_PREFIX + key);
    if (!raw) return undefined;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return undefined;
  }
}

function lsSet<T>(key: string, entry: CacheEntry<T>) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry));
  } catch {
    // quota / private mode — silent
  }
}

export function getCached<T>(key: string): T | undefined {
  const mem = MEM.get(key);
  if (mem) return mem.data as T;
  const ls = lsGet<T>(key);
  if (ls) {
    MEM.set(key, ls);
    return ls.data;
  }
  return undefined;
}

export function setCached<T>(key: string, data: T) {
  const entry = { data, fetchedAt: Date.now() };
  MEM.set(key, entry);
  lsSet(key, entry);
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    MEM.clear();
    try {
      if (typeof localStorage !== "undefined") {
        Object.keys(localStorage)
          .filter((k) => k.startsWith(LS_PREFIX))
          .forEach((k) => localStorage.removeItem(k));
      }
    } catch {
      /* ignore */
    }
    return;
  }
  for (const k of MEM.keys()) if (k.startsWith(prefix)) MEM.delete(k);
  try {
    if (typeof localStorage !== "undefined") {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(LS_PREFIX + prefix))
        .forEach((k) => localStorage.removeItem(k));
    }
  } catch {
    /* ignore */
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
