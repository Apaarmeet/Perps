"use client";

import { useOrderbook } from "@/hooks/useOrderbook";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { formatPrice, formatSize } from "@/lib/format";
import type { DepthLevel } from "@/types/trading";

function AskRow({ level, maxTotal }: { level: DepthLevel; maxTotal: number }) {
  const pct = maxTotal > 0 ? (level.total / maxTotal) * 100 : 0;
  const barWidth = Math.min(pct, 100);

  return (
    <div className="relative flex items-center h-5 text-xs font-mono tabular-nums hover:bg-white/[0.03] cursor-pointer group">
      <div
        className="absolute inset-y-0 right-0 bg-red-muted"
        style={{ width: `${barWidth}%` }}
      />
      <span className="relative z-10 flex-1 text-left pl-2 truncate text-red">
        {formatPrice(level.price)}
      </span>
      <span className="relative z-10 w-[56px] text-right pr-2 text-text-primary group-hover:text-text-primary">
        {formatSize(level.size)}
      </span>
      <span className="relative z-10 w-[56px] text-right pr-2 text-text-secondary text-[11px]">
        {formatSize(level.total)}
      </span>
    </div>
  );
}

function BidRow({ level, maxTotal }: { level: DepthLevel; maxTotal: number }) {
  const pct = maxTotal > 0 ? (level.total / maxTotal) * 100 : 0;
  const barWidth = Math.min(pct, 100);

  return (
    <div className="relative flex items-center h-5 text-xs font-mono tabular-nums hover:bg-white/[0.03] cursor-pointer group">
      <div
        className="absolute inset-y-0 left-0 bg-green-muted"
        style={{ width: `${barWidth}%` }}
      />
      <span className="relative z-10 flex-1 text-left pl-2 truncate text-green">
        {formatPrice(level.price)}
      </span>
      <span className="relative z-10 w-[56px] text-right pr-2 text-text-primary">
        {formatSize(level.size)}
      </span>
      <span className="relative z-10 w-[56px] text-right pr-2 text-text-secondary text-[11px]">
        {formatSize(level.total)}
      </span>
    </div>
  );
}

export function OrderbookPanel() {
  const { bids, asks, spread, maxTotal } = useOrderbook();
  const { perpPrice, indexPrice, direction } = usePriceFeed();

  const midColor =
    direction === "up"
      ? "text-green"
      : direction === "down"
      ? "text-red"
      : "text-text-primary";

  const midBg =
    direction === "up"
      ? "bg-green-muted/50"
      : direction === "down"
      ? "bg-red-muted/50"
      : "";

  // asks closest to mid-price come first (reversed: lowest ask → highest)
  const sortedAsks = [...asks].reverse();

  return (
    <div className="flex flex-col h-full bg-bg-secondary border border-border-default select-none">
      {/* header */}
      <div className="flex items-center px-2 py-1.5 border-b border-border-default">
        <span className="flex-1 text-[10px] text-text-muted text-left">Price</span>
        <span className="w-[56px] text-[10px] text-text-muted text-right">Size</span>
        <span className="w-[56px] text-[10px] text-text-muted text-right">Total</span>
      </div>

      {/* asks — closest to mid-price at bottom of this section */}
      <div className="flex-1 overflow-y-auto flex flex-col justify-end">
        {sortedAsks.length > 0 ? (
          sortedAsks.map((level) => (
            <AskRow key={`ask-${level.price}`} level={level} maxTotal={maxTotal} />
          ))
        ) : (
          <div className="flex-1" />
        )}
      </div>

      {/* mid price bar — Backpack style center strip */}
      <div className={`flex items-center justify-between px-3 py-2 border-y border-border-default ${midBg}`}>
        <div className="flex items-baseline gap-2">
          <span className={`text-lg font-mono font-bold tabular-nums leading-none ${midColor}`}>
            {perpPrice !== null ? formatPrice(perpPrice) : "--"}
          </span>
          {direction && (
            <span className={`text-[10px] font-mono ${midColor}`}>
              {direction === "up" ? "▲" : "▼"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-text-muted">
            Spread {spread > 0 ? formatPrice(spread) : "--"}
          </span>
          {indexPrice !== null && (
            <span className="text-[10px] text-text-muted">Idx {formatPrice(indexPrice)}</span>
          )}
        </div>
      </div>

      {/* bids — closest to mid-price at top of this section */}
      <div className="flex-1 overflow-y-auto">
        {bids.length > 0 ? (
          bids.map((level) => (
            <BidRow key={`bid-${level.price}`} level={level} maxTotal={maxTotal} />
          ))
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}
