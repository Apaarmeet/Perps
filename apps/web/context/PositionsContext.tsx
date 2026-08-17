"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useMarket } from "@/context/MarketContext";
import { useAuth } from "@/context/AuthContext";
import type { Position } from "@/types/trading";

interface PositionsContextType {
  positions: Position[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const PositionsContext = createContext<PositionsContextType | null>(null);

export function PositionsProvider({ children }: { children: ReactNode }) {
  const { market } = useMarket();
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const marketRef = useRef(market);
  marketRef.current = market;
  const userRef = useRef(user?.id);
  userRef.current = user?.id;
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPositions = useCallback(async (isInitial = false) => {
    if (!userRef.current) {
      setPositions([]);
      if (isInitial) setIsLoading(false);
      return;
    }

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

  const debouncedFetch = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchPositions(false);
    }, 150);
  }, [fetchPositions]);

  useEffect(() => {
    setIsLoading(true);
    fetchPositions(true);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [market, user, fetchPositions]);

  useWebSocket("create-order", debouncedFetch);
  useWebSocket("cancel-order", debouncedFetch);
  useWebSocket("liquidation", debouncedFetch);

  return (
    <PositionsContext.Provider
      value={{
        positions,
        isLoading,
        refetch: () => fetchPositions(false),
      }}
    >
      {children}
    </PositionsContext.Provider>
  );
}

export function usePositions(): PositionsContextType {
  const ctx = useContext(PositionsContext);
  if (!ctx) {
    throw new Error("usePositions must be used within PositionsProvider");
  }
  return ctx;
}
