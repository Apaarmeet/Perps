"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type Time,
  CrosshairMode,
  ColorType,
} from "lightweight-charts";
import { useCandles } from "@/hooks/useCandles";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { Tabs } from "@/components/ui/Tabs";
import { Spinner } from "@/components/ui/Spinner";
import { INTERVALS } from "@/lib/constants";
import type { CandleInterval } from "@/types/trading";

const BG_COLOR = "#111318";
const TEXT_COLOR = "#555a64";
const GRID_COLOR = "#1e2028";
const GREEN = "#00d4a8";
const RED = "#f5465d";

export function ChartPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const { candles, interval, setInterval, isLoading } = useCandles();

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: BG_COLOR },
        textColor: TEXT_COLOR,
      },
      grid: {
        vertLines: { color: GRID_COLOR },
        horzLines: { color: GRID_COLOR },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: GRID_COLOR,
      },
      timeScale: {
        borderColor: GRID_COLOR,
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: GREEN,
      downColor: RED,
      borderUpColor: GREEN,
      borderDownColor: RED,
      wickUpColor: GREEN,
      wickDownColor: RED,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#4c94ff22",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    chart.priceScale("").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    const candleData: CandlestickData[] = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData: HistogramData[] = candles.map((c) => ({
      time: c.time as Time,
      value: c.close > c.open ? 100 : 50,
      color: c.close >= c.open ? `${GREEN}44` : `${RED}44`,
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  const intervals = INTERVALS.map((i) => ({ id: i, label: i }));

  return (
    <div className="flex flex-col h-full bg-bg-secondary border border-border-default">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-default">
        <span className="text-xs text-text-secondary">Chart</span>
        <Tabs
          tabs={intervals}
          active={interval}
          onChange={(id) => setInterval(id as CandleInterval)}
        />
      </div>
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner />
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
