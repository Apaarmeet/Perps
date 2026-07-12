"use client";

import { useOrders } from "@/hooks/useOrders";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Tabs } from "@/components/ui/Tabs";
import { formatPrice, formatSize } from "@/lib/format";
import { useState } from "react";
import type { Fill } from "@/types/trading";

function statusVariant(status: string): "green" | "red" | "neutral" {
  if (status === "filled") return "green";
  if (status === "cancelled") return "red";
  return "neutral";
}

export function OrderHistoryTable() {
  const { allOrders, fills, isLoading } = useOrders();
  const [tab, setTab] = useState("orders");

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
                <th className="px-3 py-2 text-[10px] text-text-muted text-left">Side</th>
                <th className="px-3 py-2 text-[10px] text-text-muted text-left">Type</th>
                <th className="px-3 py-2 text-[10px] text-text-muted text-right">Price</th>
                <th className="px-3 py-2 text-[10px] text-text-muted text-right">Qty</th>
                <th className="px-3 py-2 text-[10px] text-text-muted text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {allOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-text-muted">
                    No orders
                  </td>
                </tr>
              ) : (
                allOrders.map((order) => (
                  <tr
                    key={order.orderId}
                    className="border-b border-border-default hover:bg-bg-hover transition-colors"
                  >
                    <td className="px-3 py-2 text-xs">
                      <Badge
                        label={order.side === "buy" ? "LONG" : "SHORT"}
                        variant={order.side === "buy" ? "green" : "red"}
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-text-secondary">{order.type}</td>
                    <td className="px-3 py-2 text-xs font-mono tabular-nums text-text-primary text-right">
                      {order.price !== null ? formatPrice(order.price) : "Market"}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono tabular-nums text-text-primary text-right">
                      {formatSize(order.qty)}
                    </td>
                    <td className="px-3 py-2 text-xs">
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
                <th className="px-3 py-2 text-[10px] text-text-muted text-right">Price</th>
                <th className="px-3 py-2 text-[10px] text-text-muted text-right">Qty</th>
                <th className="px-3 py-2 text-[10px] text-text-muted text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {fills.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-xs text-text-muted">
                    No fills
                  </td>
                </tr>
              ) : (
                fills.map((fill) => (
                  <tr
                    key={fill.fillId}
                    className="border-b border-border-default hover:bg-bg-hover transition-colors"
                  >
                    <td className="px-3 py-2 text-xs font-mono tabular-nums text-text-primary text-right">
                      {formatPrice(fill.Price)}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono tabular-nums text-text-primary text-right">
                      {formatSize(fill.qty)}
                    </td>
                    <td className="px-3 py-2 text-xs text-text-muted text-right">
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
