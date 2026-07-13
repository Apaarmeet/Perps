"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useWebSocket } from "./useWebSocket";
import { useMarket } from "@/context/MarketContext";
import type { DepthLevel, OrderbookData } from "@/types/trading";

type DepthTuple = [number, number];

interface WsDepth {
  symbol: string;
  asks: DepthTuple[];
  bids: DepthTuple[];
}

function buildOrderbook(raw: WsDepth): OrderbookData {
  const bidLevels = (raw.bids || [])
    .filter(([, qty]) => qty > 0)
    .sort((a, b) => b[0] - a[0]); // descending: best bid first

  const askLevels = (raw.asks || [])
    .filter(([, qty]) => qty > 0)
    .sort((a, b) => a[0] - b[0]); // ascending: best ask first

  // cumulative totals from mid outward
  let bidTotal = 0;
  const bids: DepthLevel[] = bidLevels.map(([price, qty]) => {
    bidTotal += qty;
    return { price, size: qty, total: bidTotal };
  });

  let askTotal = 0;
  const asks: DepthLevel[] = askLevels.map(([price, qty]) => {
    askTotal += qty;
    return { price, size: qty, total: askTotal };
  });

  const bestBid = bidLevels[0]?.[0] ?? 0;
  const bestAsk = askLevels[0]?.[0] ?? 0;
  const spread = bestBid && bestAsk ? bestAsk - bestBid : 0;
  const midPrice = spread > 0 ? (bestBid + bestAsk) / 2 : 0;
  const spreadPct = midPrice > 0 ? (spread / midPrice) * 100 : null;
  const maxTotal = Math.max(bidTotal, askTotal, 1);

  return { bids, asks, spread, spreadPct, maxTotal };
}

export function useOrderbook() {
  const { market } = useMarket();
  const [data, setData] = useState<OrderbookData>({
    bids: [],
    asks: [],
    spread: 0,
    spreadPct: null,
    maxTotal: 1,
  });
  const marketRef = useRef(market);
  marketRef.current = market;

  const fetchDepth = useCallback(async () => {
    try {
      const raw = await api.get<WsDepth>(`/depth/${marketRef.current}`);
      setData(buildOrderbook(raw));
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchDepth();
  }, [market, fetchDepth]);

  const handleWsDepth = useCallback(
    (wsData: unknown) => {
      const depth = wsData as WsDepth;
      if (!depth || depth.symbol !== marketRef.current) return;
      setData(buildOrderbook(depth));
    },
    []
  );

  useWebSocket("depth", handleWsDepth);

  return data;
}
