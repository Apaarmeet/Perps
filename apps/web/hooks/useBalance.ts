"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useWebSocket } from "./useWebSocket";

interface RawBalance {
  available: number;
  locked: number;
}

interface BalanceResponse {
  userId: string;
  balance: {
    USD: RawBalance;
  } | null;
}

export function useBalance() {
  const [balance, setBalance] = useState<RawBalance>({ available: 0, locked: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBalance = useCallback(async (isInitial = false) => {
    try {
      const data = await api.get<BalanceResponse>("/equity/available");
      const usd = data.balance?.USD;
      if (usd) {
        setBalance(usd);
      }
    } catch {
      // Preserve existing balance on background network error
      if (isInitial) {
        setBalance({ available: 0, locked: 0 });
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
      fetchBalance(false);
    }, 200);
  }, [fetchBalance]);

  useEffect(() => {
    setIsLoading(true);
    fetchBalance(true);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [fetchBalance]);

  useWebSocket("create-order", debouncedFetch);
  useWebSocket("cancel-order", debouncedFetch);
  useWebSocket("onRamp", debouncedFetch);

  return {
    available: balance.available,
    locked: balance.locked,
    total: balance.available + balance.locked,
    isLoading,
    refetch: () => fetchBalance(false),
  };
}
