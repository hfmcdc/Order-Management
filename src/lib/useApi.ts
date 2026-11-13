"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetches a GET endpoint and exposes { data, loading, error, refresh }.
 * Errors are surfaced as friendly messages the API already prepared
 * (see api-utils.ts) — never raw exceptions.
 */
export function useApi<T = any>(url: string | null): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  // Remembers which URL `data` belongs to, so a refresh() of the SAME url can
  // update in place (no blank "loading" screen → animations can play) while a
  // different url still shows the loading state like before.
  const loadedUrl = useRef<string | null>(null);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    if (loadedUrl.current !== url) setLoading(true);
    setError(null);

    fetch(url)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? "Something went wrong. Please try again.");
        return body;
      })
      .then((body) => {
        if (!cancelled) {
          loadedUrl.current = url;
          setData(body);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Unable to load data. Please check your connection.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url, tick]);

  return { data, loading, error, refresh };
}
