"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { MarketSymbol } from "@/types/trading";
import { SUPPORTED_MARKETS } from "@/lib/constants";

interface MarketState {
  market: MarketSymbol;
  setMarket: (m: MarketSymbol) => void;
}

const MarketContext = createContext<MarketState | null>(null);

export function MarketProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const marketParam = searchParams.get("market") as MarketSymbol | null;
  const initialMarket: MarketSymbol =
    marketParam && SUPPORTED_MARKETS.includes(marketParam as never)
      ? (marketParam as MarketSymbol)
      : "BTCUSD";

  const [market, setMarketState] = useState<MarketSymbol>(initialMarket);

  useEffect(() => {
    if (marketParam && SUPPORTED_MARKETS.includes(marketParam as never)) {
      setMarketState(marketParam as MarketSymbol);
    }
  }, [marketParam]);

  const setMarket = useCallback(
    (m: MarketSymbol) => {
      setMarketState(m);
      const params = new URLSearchParams(searchParams.toString());
      params.set("market", m);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return (
    <MarketContext.Provider value={{ market, setMarket }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket(): MarketState {
  const ctx = useContext(MarketContext);
  if (!ctx) {
    throw new Error("useMarket must be used within MarketProvider");
  }
  return ctx;
}
