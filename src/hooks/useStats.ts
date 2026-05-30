"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { StatsResponse } from "@/types";

interface UseStatsResult {
  stats: StatsResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

const REFRESH_INTERVAL_MS = 30_000;

export function useStats(): UseStatsResult {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
      const data: StatsResponse = await res.json();
      setStats(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();

    intervalRef.current = setInterval(refetch, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refetch]);

  return { stats, loading, error, refetch };
}
