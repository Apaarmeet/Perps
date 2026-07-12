"use client";

import { useMarket } from "@/context/MarketContext";
import { SUPPORTED_MARKETS } from "@/lib/constants";
import type { MarketSymbol } from "@/types/trading";

export function MarketSelector() {
  const { market, setMarket } = useMarket();

  return (
    <div className="flex gap-0.5">
      {SUPPORTED_MARKETS.map((m) => (
        <button
          key={m}
          onClick={() => setMarket(m as MarketSymbol)}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            market === m
              ? "bg-bg-tertiary text-text-primary border border-border-default"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {m.replace("USD", "/USD")}
        </button>
      ))}
    </div>
  );
}
