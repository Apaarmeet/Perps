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

  const fetchPositions = useCallback(async () => {
    try {
      const data = await api.get<{ position: Position | null }>(
        `/positions/${marketRef.current}`
      );
      if (!data || !data.position) {
        setPositions([]);
      } else {
        setPositions([data.position]);
      }
    } catch {
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchPositions();
  }, [market, fetchPositions]);

  useWebSocket("create-order", fetchPositions);
  useWebSocket("cancel-order", fetchPositions);
  useWebSocket("liquidation", fetchPositions);

  return { positions, isLoading, refetch: fetchPositions };
}
