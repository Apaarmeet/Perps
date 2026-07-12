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
  let bidTotal = 0;
  const bids: DepthLevel[] = (raw.bids || [])
    .filter(([, qty]) => qty > 0)
    .map(([price, qty]) => {
      bidTotal += qty;
      return { price, size: qty, total: bidTotal };
    });

  let askTotal = 0;
  const asks: DepthLevel[] = (raw.asks || [])
    .filter(([, qty]) => qty > 0)
    .map(([price, qty]) => {
      askTotal += qty;
      return { price, size: qty, total: askTotal };
    });

  const spread =
    asks.length > 0 && bids.length > 0
      ? asks[0].price - bids[0].price
      : 0;

  const maxTotal = Math.max(bidTotal, askTotal, 1);

  return { bids, asks, spread, maxTotal };
}

export function useOrderbook() {
  const { market } = useMarket();
  const [data, setData] = useState<OrderbookData>({
    bids: [],
    asks: [],
    spread: 0,
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
