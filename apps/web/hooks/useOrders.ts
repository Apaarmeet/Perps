"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useWebSocket } from "./useWebSocket";
import { useAuth } from "@/context/AuthContext";
import { useMarket } from "@/context/MarketContext";
import type { Order, Fill } from "@/types/trading";

interface EngineOrder {
  orderid: string;
  userId: string;
  symbol: string;
  side: "LONG" | "SHORT";
  type: "market" | "limit";
  price: number | null;
  qty: number;
  filledQty: number;
  margin: number;
  status: string;
  createdAt: number;
}

interface EngineCreateResult {
  order: EngineOrder;
  fills: Fill[];
}

function mapEngineOrder(e: EngineOrder): Order {
  return {
    orderId: e.orderid,
    userId: e.userId,
    symbol: e.symbol,
    side: e.side === "LONG" ? "buy" : "sell",
    type: e.type,
    price: e.price,
    qty: e.qty,
    filledQty: e.filledQty,
    margin: e.margin,
    Status: e.status as Order["Status"],
    createdAt: new Date(e.createdAt).toISOString(),
  };
}

function mapEnginFills(fills: any[]): Fill[] {
  return fills.map(f => ({
    fillId: f.fillId,
    symbol: f.symbol,
    Price: f.price,
    qty: f.qty,
    buyorderId: f.makerOrderid ?? f.buyorderId ?? "",
    sellOrderId: f.takerOrderId ?? f.sellOrderId ?? "",
    createdAt: new Date(f.createdAt).toISOString(),
  }));
}

export function useOrders() {
  const { market } = useMarket();
  const { user } = useAuth();
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [fills, setFills] = useState<Fill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const marketRef = useRef(market);
  marketRef.current = market;
  const userRef = useRef(user?.id);
  userRef.current = user?.id;

  const fetchAll = useCallback(async () => {
    try {
      const [open, all, fls] = await Promise.all([
        api.get<Order[]>(`/orders/open/${marketRef.current}`),
        api.get<Order[]>(`/orders/${marketRef.current}`),
        api.get<Fill[]>(`/fills`),
      ]);
      setOpenOrders(open || []);
      setAllOrders(all || []);
      setFills(fls || []);
    } catch {
      setOpenOrders([]);
      setAllOrders([]);
      setFills([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [market, fetchAll]);

  const handleCreateOrder = useCallback((data: unknown) => {
    const result = data as EngineCreateResult;
    if (!result?.order) return;

    const mapped = mapEngineOrder(result.order);

    if (mapped.symbol !== marketRef.current) return;
    if (userRef.current && mapped.userId !== userRef.current) return;

    setOpenOrders(prev => [mapped, ...prev]);
    setAllOrders(prev => [mapped, ...prev]);
    if (result.fills?.length) {
      const mappedFills = mapEnginFills(result.fills);
      setFills(prev => [...mappedFills, ...prev]);
    }
  }, []);


  const handleCancelOrder = useCallback((data: unknown) => {
    const order = data as EngineOrder;
    if (!order?.orderid) return;
    if (userRef.current && order.userId !== userRef.current) return;

    const mapped = mapEngineOrder(order);
    setOpenOrders(prev => prev.filter(o => o.orderId !== mapped.orderId));
    setAllOrders(prev => {
      const idx = prev.findIndex(o => o.orderId === mapped.orderId);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx] = mapped;
      return copy;
    });
  }, []);

  useWebSocket("create-order", handleCreateOrder);
  useWebSocket("cancel-order", handleCancelOrder);

  return { openOrders, allOrders, fills, isLoading, refetch: fetchAll };
}
