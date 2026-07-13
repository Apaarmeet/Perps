"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useOrders } from "@/hooks/useOrders";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice, formatSize } from "@/lib/format";
import type { Order } from "@/types/trading";
import { X } from "lucide-react";

function statusVariant(status: string): "green" | "red" | "neutral" {
  if (status === "filled") return "green";
  if (status === "cancelled") return "red";
  return "neutral";
}

function OrderRow({ order, onCancel }: { order: Order; onCancel: () => void }) {
  return (
    <tr className="border-b border-border-default/50 hover:bg-bg-hover/50 transition-colors">
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
      <td className="px-3 py-2 text-sm font-mono tabular-nums text-text-primary text-right">
        {formatSize(order.filledQty)}
      </td>
      <td className="px-3 py-2">
        <Badge label={order.Status} variant={statusVariant(order.Status)} />
      </td>
      <td className="px-3 py-2 text-right">
        {(order.Status === "open" || order.Status === "partially_filled") && (
          <Button
            variant="danger"
            className="!px-2 !py-1 text-[10px]"
            onClick={onCancel}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </td>
    </tr>
  );
}

export function OpenOrdersTable() {
  const { openOrders, isLoading } = useOrders();
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function handleCancel(orderId: string) {
    setCancelling(orderId);
    try {
      await api.delete("/order", { orderId });
      toast.success("Order cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-default">
            <th className="px-3 py-2 text-xs text-text-muted font-medium uppercase tracking-wider text-left">Side</th>
            <th className="px-3 py-2 text-xs text-text-muted font-medium uppercase tracking-wider text-left">Type</th>
            <th className="px-3 py-2 text-xs text-text-muted font-medium uppercase tracking-wider text-right">Price</th>
            <th className="px-3 py-2 text-xs text-text-muted font-medium uppercase tracking-wider text-right">Qty</th>
            <th className="px-3 py-2 text-xs text-text-muted font-medium uppercase tracking-wider text-right">Filled</th>
            <th className="px-3 py-2 text-xs text-text-muted font-medium uppercase tracking-wider text-left">Status</th>
            <th className="px-3 py-2 text-xs text-text-muted font-medium uppercase tracking-wider text-right"></th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={7} className="py-10 text-center">
                <Spinner />
              </td>
            </tr>
          ) : openOrders.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-10 text-center text-sm text-text-muted">
                No open orders
              </td>
            </tr>
          ) : (
            openOrders.map((order) => (
              <OrderRow
                key={order.orderId}
                order={order}
                onCancel={() => handleCancel(order.orderId)}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
