"use client";

import { useState } from "react";
import { usePositions } from "@/hooks/usePositions";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { useMarket } from "@/context/MarketContext";
import { useBalance } from "@/hooks/useBalance";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import { formatPrice, formatSize, formatUSD, formatPercent } from "@/lib/format";
import type { Position } from "@/types/trading";

function PositionRow({ pos, onClose }: { pos: Position; onClose: () => void }) {
  const { indexPrice } = usePriceFeed();
  const markPrice = indexPrice ?? pos.averagePrice;
  const pnl =
    pos.side === "LONG"
      ? (markPrice - pos.averagePrice) * pos.qty
      : (pos.averagePrice - markPrice) * pos.qty;
  const pnlPercent =
    pos.margin > 0 ? (pnl / pos.margin) * 100 * pos.leverage : 0;

  const [closing, setClosing] = useState(false);

  async function handleClose() {
    setClosing(true);
    try {
      const closeSide = pos.side === "LONG" ? "SHORT" : "LONG";
      await api.post("/order", {
        type: "market",
        side: closeSide,
        symbol: pos.userId ? "BTCUSD" : "BTCUSD", // will be fixed below
        price: null,
        qty: pos.qty,
        leverage: pos.leverage,
        sllipage: 1,
      });
      onClose();
    } catch {
    } finally {
      setClosing(false);
    }
  }

  return (
    <tr className="border-b border-border-default hover:bg-bg-hover transition-colors">
      <td className="px-3 py-2 text-xs">
        <Badge label={pos.side} variant={pos.side === "LONG" ? "green" : "red"} />
      </td>
      <td className="px-3 py-2 text-xs font-mono tabular-nums text-text-primary text-right">
        {formatSize(pos.qty)}
      </td>
      <td className="px-3 py-2 text-xs font-mono tabular-nums text-text-primary text-right">
        {formatPrice(pos.averagePrice)}
      </td>
      <td className="px-3 py-2 text-xs font-mono tabular-nums text-text-primary text-right">
        {formatPrice(markPrice)}
      </td>
      <td className="px-3 py-2 text-xs font-mono tabular-nums text-red text-right">
        {formatPrice(pos.liquidationPrice)}
      </td>
      <td className={`px-3 py-2 text-xs font-mono tabular-nums text-right ${pnl >= 0 ? "text-green" : "text-red"}`}>
        {formatUSD(pnl)}
      </td>
      <td className={`px-3 py-2 text-xs font-mono tabular-nums text-right ${pnlPercent >= 0 ? "text-green" : "text-red"}`}>
        {formatPercent(pnlPercent)}
      </td>
      <td className="px-2 py-1 text-right">
        <Button
          variant="danger"
          onClick={handleClose}
          disabled={closing}
          className="!px-2 !py-0.5 text-[10px]"
        >
          {closing ? "..." : "Close"}
        </Button>
      </td>
    </tr>
  );
}

export function PositionsTable() {
  const { positions, isLoading } = usePositions();
  const { market } = useMarket();
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
        sllipage: 1,
      });
      refetchBalance();
    } catch {
      // ignore
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-default">
            <th className="px-3 py-2 text-[10px] text-text-muted text-left">Side</th>
            <th className="px-3 py-2 text-[10px] text-text-muted text-right">Size</th>
            <th className="px-3 py-2 text-[10px] text-text-muted text-right">Entry</th>
            <th className="px-3 py-2 text-[10px] text-text-muted text-right">Mark</th>
            <th className="px-3 py-2 text-[10px] text-text-muted text-right">Liq.</th>
            <th className="px-3 py-2 text-[10px] text-text-muted text-right">PnL</th>
            <th className="px-3 py-2 text-[10px] text-text-muted text-right">PnL%</th>
            <th className="px-3 py-2 text-[10px] text-text-muted text-right w-14"></th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={8} className="py-8 text-center">
                <Spinner />
              </td>
            </tr>
          ) : positions.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-8 text-center text-xs text-text-muted">
                No open positions
              </td>
            </tr>
          ) : (
            positions.map((pos, i) => (
              <PositionRow
                key={i}
                pos={pos}
                onClose={() => handleClosePosition(pos)}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
