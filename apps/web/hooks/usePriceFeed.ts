"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useWebSocket } from "./useWebSocket";
import { useMarket } from "@/context/MarketContext";

interface PriceState {
  perpPrice: number | null;
  indexPrice: number | null;
  direction: "up" | "down" | null;
  change24h: number | null;
}

export function usePriceFeed() {
  const { market } = useMarket();
  const [state, setState] = useState<PriceState>({
    perpPrice: null,
    indexPrice: null,
    direction: null,
    change24h: null,
  });
  const basePriceRef = useRef<number | null>(null);
  const prevPerpRef = useRef<number | null>(null);

  useEffect(() => {
    basePriceRef.current = null;
    prevPerpRef.current = null;
    hasPriceUpdateRef.current = false;
    setState({
      perpPrice: null,
      indexPrice: null,
      direction: null,
      change24h: null,
    });
  }, [market]);

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
      const msg = data as { symbol: string; perpPrice: number | null; indexPrice: number };
      if (!msg || msg.symbol !== market) return;

      const { perpPrice, indexPrice } = msg;
      hasPriceUpdateRef.current = true;

      // Always update indexPrice
      const next: Partial<PriceState> = { indexPrice };

      if (perpPrice != null) {
        const prev = prevPerpRef.current;
        prevPerpRef.current = perpPrice;

        if (basePriceRef.current === null) {
          basePriceRef.current = perpPrice;
        }

        next.perpPrice = perpPrice;
        next.direction = prev !== null ? (perpPrice > prev ? "up" : perpPrice < prev ? "down" : null) : null;
        next.change24h =
          basePriceRef.current !== null
            ? ((perpPrice - basePriceRef.current) / basePriceRef.current) * 100
            : null;
      }

      setState((s) => ({ ...s, ...next }));
    },
    [market]
  );

  // Track whether price-update from engine has been received
  const hasPriceUpdateRef = useRef(false);

  const handleDepth = useCallback(
    (data: unknown) => {
      const depth = data as { symbol: string; asks: [number, number][]; bids: [number, number][] };
      if (!depth || depth.symbol !== market) return;

      // Do NOT overwrite perpPrice once price-update from engine has arrived
      if (hasPriceUpdateRef.current) return;

      const bestBid = depth.bids?.[0]?.[0];
      const bestAsk = depth.asks?.[0]?.[0];
      if (!bestBid || !bestAsk) return;

      const mid = (bestBid + bestAsk) / 2;
      const prev = prevPerpRef.current;
      prevPerpRef.current = mid;

      if (basePriceRef.current === null) {
        basePriceRef.current = mid;
      }

      setState((s) => ({
        ...s,
        perpPrice: mid,
        direction: prev !== null ? (mid > prev ? "up" : mid < prev ? "down" : s.direction) : s.direction,
        change24h:
          basePriceRef.current !== null
            ? ((mid - basePriceRef.current) / basePriceRef.current) * 100
            : null,
      }));
    },
    [market]
  );

  useWebSocket("price", handleRawPrice);
  useWebSocket("depth", handleDepth);
  useWebSocket("price-update", handlePriceUpdate);

  return state;
}
