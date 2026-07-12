"use client";

import { useState, useEffect, useCallback } from "react";
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

  const fetchBalance = useCallback(async () => {
    try {
      const data = await api.get<BalanceResponse>("/equity/available");
      const usd = data.balance?.USD;
      setBalance(usd ?? { available: 0, locked: 0 });
    } catch {
      setBalance({ available: 0, locked: 0 });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  useWebSocket("create-order", fetchBalance);
  useWebSocket("cancel-order", fetchBalance);
  useWebSocket("onRamp", fetchBalance);

  return {
    available: balance.available,
    locked: balance.locked,
    total: balance.available + balance.locked,
    isLoading,
    refetch: fetchBalance,
  };
}
