"use client";

import { useOrderbook } from "@/hooks/useOrderbook";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { formatPrice, formatSize } from "@/lib/format";
import type { DepthLevel } from "@/types/trading";

function DepthRow({
  level,
  maxTotal,
  barColor,
  textColor,
  onClick,
}: {
  level: DepthLevel;
  maxTotal: number;
  barColor: string;
  textColor: string;
  onClick?: () => void;
}) {
  const pct = maxTotal > 0 ? (level.total / maxTotal) * 100 : 0;

  return (
    <div
      className="relative flex items-center h-[18px] xl:h-[20px] cursor-pointer group"
      onClick={onClick}
    >
      <div
        className="absolute inset-y-0 right-0"
        style={{
          width: `${Math.min(pct, 100)}%`,
          backgroundColor: barColor,
        }}
      />
      <span className={`relative z-10 flex-1 pl-2 truncate text-sm font-mono tabular-nums ${textColor}`}>
        {formatPrice(level.price)}
      </span>
      <span className="relative z-10 w-[64px] text-right pr-2 text-sm font-mono tabular-nums text-text-primary">
        {formatSize(level.size)}
      </span>
      <span className="relative z-10 w-[60px] text-right pr-2 text-sm font-mono tabular-nums text-text-secondary">
        {formatSize(level.total)}
      </span>
    </div>
  );
}

interface OrderbookPanelProps {
  onPriceClick?: (price: number) => void;
}

export function OrderbookPanel({ onPriceClick }: OrderbookPanelProps) {
  const { bids, asks, spread, spreadPct, maxTotal } = useOrderbook();
  const { perpPrice, direction } = usePriceFeed();

  const midColor =
    direction === "up" ? "text-green" : direction === "down" ? "text-red" : "text-text-primary";

  const sortedAsks = [...asks].reverse();
  const maxRows = 12;
  const paddedAsks = [
    ...Array(Math.max(0, maxRows - sortedAsks.length)).fill(null),
    ...sortedAsks,
  ].slice(-maxRows);
  const paddedBids = bids.slice(0, maxRows);

  return (
    <div className="flex flex-col h-full bg-bg-secondary select-none">
      <div className="flex items-center px-2 py-1.5 border-b border-border-default">
        <span className="flex-1 text-xs text-text-muted text-left font-medium uppercase tracking-wider">Price</span>
        <span className="w-[64px] text-xs text-text-muted text-right font-medium uppercase tracking-wider">Size</span>
        <span className="w-[60px] text-xs text-text-muted text-right font-medium uppercase tracking-wider">Total</span>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col justify-end">
        {paddedAsks.map((level, i) =>
          level ? (
            <DepthRow
              key={`ask-${level.price}`}
              level={level}
              maxTotal={maxTotal}
              textColor="text-red"
              barColor="rgba(232, 66, 92, 0.08)"
              onClick={() => onPriceClick?.(level.price)}
            />
          ) : (
            <div key={`ask-empty-${i}`} className="h-[18px] xl:h-[20px]" />
          )
        )}
      </div>

      <div
        className={`flex items-center justify-between px-2 py-2 border-y border-border-default ${
          direction === "up" ? "bg-green/5" : direction === "down" ? "bg-red/5" : ""
        }`}
      >
        <span className={`text-lg font-mono font-bold tabular-nums leading-none ${midColor}`}>
          {perpPrice !== null ? formatPrice(perpPrice) : "--"}
        </span>
        {spread > 0 && (
          <span className="text-xs text-text-muted font-mono tabular-nums">
            {formatPrice(spread)}
            {spreadPct !== null && ` (${spreadPct.toFixed(3)}%)`}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {paddedBids.map((level) => (
          <DepthRow
            key={`bid-${level.price}`}
            level={level}
            maxTotal={maxTotal}
            textColor="text-green"
            barColor="rgba(2, 194, 120, 0.08)"
            onClick={() => onPriceClick?.(level.price)}
          />
        ))}
      </div>
    </div>
  );
}
