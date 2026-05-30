"use client";

import { useState, useEffect, useRef } from "react";

interface UseSSEResult<T> {
  data: T | null;
  error: Error | null;
  connected: boolean;
}

const MAX_RETRIES = 5;

export function useSSE<T = unknown>(
  url: string,
  enabled: boolean
): UseSSEResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [connected, setConnected] = useState(false);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function connect() {
      esRef.current?.close();
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        setConnected(true);
        setError(null);
        retryCountRef.current = 0;
      };

      es.onmessage = (event) => {
        try {
          setData(JSON.parse(event.data) as T);
        } catch {
          // Ignore non-JSON frames
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();

        if (retryCountRef.current >= MAX_RETRIES) {
          setError(
            new Error(
              `SSE connection lost after ${MAX_RETRIES} retries (${url})`
            )
          );
          return;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delay = Math.pow(2, retryCountRef.current) * 1000;
        retryCountRef.current++;
        retryTimerRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      esRef.current?.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [url, enabled]);

  return { data, error, connected };
}
