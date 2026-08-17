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
import { useAuth } from "@/context/AuthContext";

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

interface BalanceContextType {
  available: number;
  locked: number;
  total: number;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const BalanceContext = createContext<BalanceContextType | null>(null);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<RawBalance>({ available: 0, locked: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBalance = useCallback(async (isInitial = false) => {
    if (!user) {
      setBalance({ available: 0, locked: 0 });
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.get<BalanceResponse>("/equity/available");
      const usd = data.balance?.USD;
      if (usd) {
        setBalance(usd);
      }
    } catch {
      // Preserve existing balance on background network failure
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  }, [user]);

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

  const handleWsEvent = useCallback((data: any) => {
    if (!user) return;
    const touched = data?.touchedUsers || [];
    const affectedUserId = data?.userId || data?.order?.userId;
    if (touched.includes(user.id) || affectedUserId === user.id) {
      debouncedFetch();
    }
  }, [user, debouncedFetch]);

  useWebSocket("create-order", handleWsEvent);
  useWebSocket("cancel-order", handleWsEvent);
  useWebSocket("onRamp", handleWsEvent);
  useWebSocket("liquidation", handleWsEvent);

  return (
    <BalanceContext.Provider
      value={{
        available: balance.available,
        locked: balance.locked,
        total: balance.available + balance.locked,
        isLoading,
        refetch: () => fetchBalance(false),
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance(): BalanceContextType {
  const ctx = useContext(BalanceContext);
  if (!ctx) {
    throw new Error("useBalance must be used within BalanceProvider");
  }
  return ctx;
}
