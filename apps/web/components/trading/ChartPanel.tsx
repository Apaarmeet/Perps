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
import { Tabs } from "@/components/ui/Tabs";
import { Spinner } from "@/components/ui/Spinner";
import { INTERVALS } from "@/lib/constants";
import type { CandleInterval } from "@/types/trading";

const BG_COLOR = "#0f1116";
const TEXT_COLOR = "#4b5162";
const GRID_COLOR = "#1c1f28";
const GREEN = "#02c278";
const RED = "#e8425c";

const INTERVAL_TABS = INTERVALS.map((i) => ({ id: i, label: i }));

export function ChartPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const isInitialLoad = useRef(true);

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
        autoScale: true,
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
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    chart.priceScale("").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    if (candles.length === 0) {
      candleSeriesRef.current.setData([]);
      volumeSeriesRef.current.setData([]);
      return;
    }

    const candleData: CandlestickData[] = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData: HistogramData[] = candles.map((c) => ({
      time: c.time as Time,
      value: Math.abs(c.close - c.open) * (c.close + c.open) / 2,
      color: c.close >= c.open ? `${GREEN}44` : `${RED}44`,
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    if (isInitialLoad.current) {
      chartRef.current?.timeScale().fitContent();
      isInitialLoad.current = false;
    }
  }, [candles]);

  useEffect(() => {
    isInitialLoad.current = true;
  }, [interval]);

  return (
    <div className="flex flex-col h-full bg-bg-secondary border border-border-default">
      <div className="flex items-center justify-between px-3 py-1 border-b border-border-default">
        <span className="text-xs text-text-secondary font-medium">Chart</span>
        <Tabs
          tabs={INTERVAL_TABS}
          active={interval}
          onChange={(id) => setInterval(id as CandleInterval)}
        />
      </div>
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-bg-secondary/50">
            <Spinner />
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
