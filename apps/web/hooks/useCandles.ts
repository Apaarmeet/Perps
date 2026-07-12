"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useWebSocket } from "./useWebSocket";
import { useMarket } from "@/context/MarketContext";
import { CANDLE_HISTORY_LIMIT } from "@/lib/constants";
import type {
  CandleData,
  CandleResponse,
  CandleInterval,
  CandleWsData,
} from "@/types/trading";

export function useCandles() {
  const { market } = useMarket();
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [interval, setIntervalState] = useState<CandleInterval>("1m");
  const [isLoading, setIsLoading] = useState(true);
  const marketRef = useRef(market);
  marketRef.current = market;
  const intervalRef = useRef(interval);
  intervalRef.current = interval;

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<CandleResponse[]>(
        `/candles/${marketRef.current}?interval=${intervalRef.current}&limit=${CANDLE_HISTORY_LIMIT}`
      );
      const mapped: CandleData[] = data.map((c) => ({
        time: Math.floor(new Date(c.time).getTime() / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      setCandles(mapped);
    } catch {
      setCandles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [market, interval, fetchHistory]);

  const handleWsCandle = useCallback((data: unknown) => {
    const wsData = data as CandleWsData;
    if (!wsData?.key || !wsData?.candle) return;

    const [symbol, intv] = wsData.key.split(":");
    if (symbol !== marketRef.current || intv !== intervalRef.current) return;

    const ts = Math.floor(wsData.candle.timestamp / 1000);
    const newCandle: CandleData = {
      time: ts,
      open: wsData.candle.open,
      high: wsData.candle.high,
      low: wsData.candle.low,
      close: wsData.candle.close,
    };

    setCandles((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.time === ts) {
        const copy = [...prev];
        copy[copy.length - 1] = newCandle;
        return copy;
      }
      return [...prev, newCandle].slice(-CANDLE_HISTORY_LIMIT);
    });
  }, []);

  useWebSocket("candle", handleWsCandle);
  useWebSocket("candle-update", handleWsCandle);

  return { candles, interval, setInterval: setIntervalState, isLoading };
}
