"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useWebSocket } from "./useWebSocket";
import { useMarket } from "@/context/MarketContext";
import type { Position } from "@/types/trading";

export function usePositions() {
  const { market } = useMarket();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const marketRef = useRef(market);
  marketRef.current = market;
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPositions = useCallback(async (isInitial = false) => {
    try {
      const data = await api.get<{ position: Position | null }>(
        `/positions/${marketRef.current}`
      );
      if (!data || !data.position || data.position.qty === 0) {
        setPositions([]);
      } else {
        setPositions([data.position]);
      }
    } catch {
      // Preserve existing position on background network error
      if (isInitial) {
        setPositions([]);
      }
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  }, []);

  // Debounced refetch for real-time WebSocket events
  const debouncedFetch = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchPositions(false);
    }, 200);
  }, [fetchPositions]);

  useEffect(() => {
    setIsLoading(true);
    fetchPositions(true);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [market, fetchPositions]);

  useWebSocket("create-order", debouncedFetch);
  useWebSocket("cancel-order", debouncedFetch);
  useWebSocket("liquidation", debouncedFetch);

  return { positions, isLoading, refetch: () => fetchPositions(false) };
}
