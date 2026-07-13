"use client";

import { usePositions } from "@/hooks/usePositions";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { useMarket } from "@/context/MarketContext";
import { useBalance } from "@/hooks/useBalance";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { formatPrice, formatSize, formatUSD, formatPercent } from "@/lib/format";
import type { Position } from "@/types/trading";

export function PositionsTable() {
  const { positions, isLoading, refetch: refetchPositions } = usePositions();
  const { market } = useMarket();
  const { indexPrice } = usePriceFeed();
  const { refetch: refetchBalance } = useBalance();

  async function handleClosePosition(pos: Position) {
    const closeSide = pos.side === "LONG" ? "SHORT" : "LONG";
    try {
      await api.post("/order", {
        type: "market",
        side: closeSide,
        symbol: market,
        price: null,
        qty: pos.qty,
        leverage: pos.leverage,
        slippage: 1,
      });
      refetchBalance();
      refetchPositions();
      toast.success("Position closed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Close failed");
    }
  }

  const index = indexPrice ?? 0;

  const COLUMNS = [
    { key: "side", label: "Side", align: "left" as const },
    { key: "size", label: "Size", align: "right" as const },
    { key: "entry", label: "Entry", align: "right" as const },
    { key: "index", label: "Index", align: "right" as const },
    { key: "liq", label: "Liq.", align: "right" as const },
    { key: "margin", label: "Margin", align: "right" as const },
    { key: "pnl", label: "PnL", align: "right" as const },
    { key: "pnlPct", label: "PnL%", align: "right" as const },
    { key: "actions", label: "", align: "right" as const },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-default">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2 text-xs text-text-muted font-medium uppercase tracking-wider ${
                  col.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={COLUMNS.length} className="py-10 text-center">
                <Spinner />
              </td>
            </tr>
          ) : positions.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="py-10 text-center text-sm text-text-muted">
                No open positions
              </td>
            </tr>
          ) : (
            positions.map((pos) => {
              const idx = index || pos.averagePrice;
              const pnl =
                pos.side === "LONG"
                  ? (idx - pos.averagePrice) * pos.qty
                  : (pos.averagePrice - idx) * pos.qty;
              const pnlPct = pos.margin > 0 ? (pnl / pos.margin) * 100 : 0;
              const pnlColor = pnl >= 0 ? "text-green" : "text-red";

              return (
                <tr key={pos.userId + pos.side} className="border-b border-border-default/50 hover:bg-bg-hover/50 transition-colors">
                  <td className="px-3 py-2">
                    <Badge label={pos.side} variant={pos.side === "LONG" ? "green" : "red"} />
                  </td>
                  <td className="px-3 py-2 text-sm font-mono tabular-nums text-text-primary text-right">
                    {formatSize(pos.qty)}
                  </td>
                  <td className="px-3 py-2 text-sm font-mono tabular-nums text-text-secondary text-right">
                    {formatPrice(pos.averagePrice)}
                  </td>
                  <td className={`px-3 py-2 text-sm font-mono tabular-nums text-right ${pnlColor}`}>
                    {formatPrice(idx)}
                  </td>
                  <td className="px-3 py-2 text-sm font-mono tabular-nums text-red text-right">
                    {formatPrice(pos.liquidationPrice)}
                  </td>
                  <td className="px-3 py-2 text-sm font-mono tabular-nums text-text-primary text-right">
                    {formatUSD(pos.margin)}
                  </td>
                  <td className={`px-3 py-2 text-sm font-mono tabular-nums text-right font-medium ${pnlColor}`}>
                    {formatUSD(pnl)}
                  </td>
                  <td className={`px-3 py-2 text-sm font-mono tabular-nums text-right ${pnlColor}`}>
                    {formatPercent(pnlPct)}
                  </td>
                  <td className="px-2 py-1 text-right">
                    <button
                      onClick={() => handleClosePosition(pos)}
                      className="text-xs text-text-muted hover:text-red transition-colors font-medium"
                    >
                      Close
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
