"use client";

import { useOrders } from "@/hooks/useOrders";
import { useMarket } from "@/context/MarketContext";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Tabs } from "@/components/ui/Tabs";
import { formatPrice, formatSize } from "@/lib/format";
import { useState, useMemo } from "react";
import type { Fill } from "@/types/trading";

function statusVariant(status: string): "green" | "red" | "neutral" {
  if (status === "filled") return "green";
  if (status === "cancelled") return "red";
  return "neutral";
}

export function OrderHistoryTable() {
  const { market } = useMarket();
  const { allOrders, fills, isLoading } = useOrders();
  const [tab, setTab] = useState("orders");

  const marketOrders = useMemo(
    () => allOrders.filter((o) => o.symbol === market && o.Status !== "open" && o.Status !== "partially_filled"),
    [allOrders, market],
  );

  return (
    <div>
      <Tabs
        tabs={[
          { id: "orders", label: "Orders" },
          { id: "fills", label: "Fills" },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Spinner />
          </div>
        ) : tab === "orders" ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-default">
                <th className="px-3 py-2 text-xs text-text-muted font-medium uppercase tracking-wider text-left">Side</th>
                <th className="px-3 py-2 text-xs text-text-muted font-medium uppercase tracking-wider text-left">Type</th>
                <th className="px-3 py-2 text-xs text-text-muted font-medium uppercase tracking-wider text-right">Price</th>
                <th className="px-3 py-2 text-xs text-text-muted font-medium uppercase tracking-wider text-right">Qty</th>
                <th className="px-3 py-2 text-xs text-text-muted font-medium uppercase tracking-wider text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {marketOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-text-muted">
                    No orders
                  </td>
                </tr>
              ) : (
                marketOrders.map((order) => (
                  <tr
                    key={order.orderId}
                    className="border-b border-border-default/50 hover:bg-bg-hover/50 transition-colors"
                  >
                    <td className="px-3 py-2">
                      <Badge
                        label={order.side === "buy" ? "LONG" : "SHORT"}
                        variant={order.side === "buy" ? "green" : "red"}
                      />
                    </td>
                    <td className="px-3 py-2 text-sm text-text-secondary">{order.type}</td>
                    <td className="px-3 py-2 text-sm font-mono tabular-nums text-text-primary text-right">
                      {order.price !== null ? formatPrice(order.price) : "Market"}
                    </td>
                    <td className="px-3 py-2 text-sm font-mono tabular-nums text-text-primary text-right">
                      {formatSize(order.qty)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge label={order.Status} variant={statusVariant(order.Status)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-default">
                <th className="px-3 py-2 text-xs text-text-muted font-medium uppercase tracking-wider text-right">Price</th>
                <th className="px-3 py-2 text-xs text-text-muted font-medium uppercase tracking-wider text-right">Qty</th>
                <th className="px-3 py-2 text-xs text-text-muted font-medium uppercase tracking-wider text-right">Maker Order</th>
                <th className="px-3 py-2 text-xs text-text-muted font-medium uppercase tracking-wider text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {fills.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-text-muted">
                    No fills
                  </td>
                </tr>
              ) : (
                fills.map((fill) => (
                  <tr
                    key={fill.fillId}
                    className="border-b border-border-default/50 hover:bg-bg-hover/50 transition-colors"
                  >
                    <td className="px-3 py-2 text-sm font-mono tabular-nums text-text-primary text-right">
                      {formatPrice(fill.Price)}
                    </td>
                    <td className="px-3 py-2 text-sm font-mono tabular-nums text-text-primary text-right">
                      {formatSize(fill.qty)}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono tabular-nums text-text-muted text-right">
                      {fill.makerOrderId ? fill.makerOrderId.slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="px-3 py-2 text-sm text-text-muted text-right font-mono tabular-nums">
                      {new Date(fill.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
