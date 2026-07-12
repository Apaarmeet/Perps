"use client";

import { usePriceFeed } from "@/hooks/usePriceFeed";
import { formatPrice } from "@/lib/format";

export function LastPrice() {
  const { perpPrice, indexPrice, direction } = usePriceFeed();

  const perpColor = direction === "up" ? "text-green" : direction === "down" ? "text-red" : "text-text-primary";

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-baseline gap-1.5">
        <span className={`text-lg font-mono font-semibold tabular-nums ${perpColor}`}>
          {perpPrice !== null ? formatPrice(perpPrice) : "--"}
        </span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider">Perp</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xs font-mono tabular-nums text-text-secondary">
          {indexPrice !== null ? formatPrice(indexPrice) : "--"}
        </span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider">Index</span>
      </div>
    </div>
  );
}
