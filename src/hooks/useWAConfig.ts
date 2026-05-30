"use client";

import { useState, useEffect, useCallback } from "react";
import type { WAConfig } from "@/types";

interface UseWAConfigResult {
  config: WAConfig | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useWAConfig(): UseWAConfigResult {
  const [config, setConfig] = useState<WAConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
      const data = await res.json();
      setConfig(data.config ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { config, loading, error, refetch };
}
