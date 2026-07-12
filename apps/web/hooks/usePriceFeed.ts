"use client";

import { useState, useRef, useCallback } from "react";
import { useWebSocket } from "./useWebSocket";
import { useMarket } from "@/context/MarketContext";

interface PriceState {
  perpPrice: number | null;
  indexPrice: number | null;
  prevPerp: number | null;
  direction: "up" | "down" | null;
}

export function usePriceFeed() {
  const { market } = useMarket();
  const [state, setState] = useState<PriceState>({
    perpPrice: null,
    indexPrice: null,
    prevPerp: null,
    direction: null,
  });

  const handleRawPrice = useCallback(
    (data: unknown) => {
      const tick = data as { symbol: string; price: string };
      if (!tick || tick.symbol !== market) return;

      const indexPrice = parseFloat(tick.price);
      if (isNaN(indexPrice)) return;

      setState((prev) => ({
        ...prev,
        indexPrice,
      }));
    },
    [market]
  );

  const handlePriceUpdate = useCallback(
    (data: unknown) => {
      const update = data as { symbol: string; perpPrice: number | null; indexPrice: number };
      if (!update || update.symbol !== market) return;

      const perp = update.perpPrice;
      if (perp == null || isNaN(perp)) return; // skip if no perp price yet (only index)

      setState((prev) => ({
        perpPrice: perp,
        indexPrice: update.indexPrice ?? prev.indexPrice,
        prevPerp: prev.perpPrice,
        direction:
          prev.perpPrice !== null
            ? perp > prev.perpPrice
              ? "up"
              : perp < prev.perpPrice
              ? "down"
              : prev.direction
            : prev.direction,
      }));
    },
    [market]
  );

  useWebSocket("price", handleRawPrice);
  useWebSocket("price-update", handlePriceUpdate);

  return state;
}
