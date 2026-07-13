"use client";

import { useState, useEffect, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useMarket } from "@/context/MarketContext";
import { useBalance } from "@/hooks/useBalance";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { Input } from "@/components/ui/Input";
import { toast } from "@/lib/toast";
import {
  DEFAULT_LEVERAGE,
  MIN_LEVERAGE,
  MAX_LEVERAGE,
  LEVERAGE_STEPS,
  QTY_PERCENTAGES,
} from "@/lib/constants";
import { formatUSD, formatPrice } from "@/lib/format";
import type { OrderType, Side } from "@/types/trading";

interface OrderFormProps {
  setPriceRef?: { current: ((p: number) => void) | null };
}

export function OrderForm({ setPriceRef }: OrderFormProps) {
  const { market } = useMarket();
  const { available, refetch: refetchBalance } = useBalance();
  const { perpPrice } = usePriceFeed();

  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [side, setSide] = useState<Side>("LONG");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);
  const [slippage, setSlippage] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (setPriceRef) {
      setPriceRef.current = (p: number) => {
        setPrice(p.toFixed(2));
        setOrderType("limit");
      };
    }
  }, [setPriceRef]);

  useEffect(() => {
    setPrice("");
    setQty("");
    setError("");
  }, [market]);

  const priceNum = parseFloat(price) || 0;
  const qtyNum = parseFloat(qty) || 0;
  const slippageNum = parseFloat(slippage) || 0;

  const entryPrice = orderType === "limit" ? priceNum : (perpPrice ?? 0);
  const margin =
    qtyNum > 0 && entryPrice > 0
      ? (entryPrice * qtyNum) / leverage
      : 0;
  const effectiveMargin =
    orderType === "market" && entryPrice > 0
      ? margin * (1 + slippageNum / 100)
      : margin;

  const estimatedLiqPrice = (() => {
    if (qtyNum <= 0 || leverage <= 0 || entryPrice <= 0) return 0;
    const liqThreshold = entryPrice * (1 / leverage);
    return side === "LONG" ? entryPrice - liqThreshold : entryPrice + liqThreshold;
  })();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (qtyNum <= 0) {
      setError("Enter quantity");
      return;
    }
    if (orderType === "limit" && priceNum <= 0) {
      setError("Enter price");
      return;
    }
    if (orderType === "market" && (!perpPrice || perpPrice <= 0)) {
      setError("No market price available");
      return;
    }
    if (effectiveMargin > available) {
      setError(
        orderType === "market"
          ? "Insufficient balance (includes slippage buffer)"
          : "Insufficient balance"
      );
      return;
    }

    setLoading(true);
    try {
      await api.post("/order", {
        type: orderType,
        side,
        symbol: market,
        price: orderType === "limit" ? priceNum : null,
        qty: qtyNum,
        leverage,
        slippage: slippageNum,
      });
      setPrice("");
      setQty("");
      refetchBalance();
      toast.success("Order placed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col h-full bg-bg-secondary"
    >
      <div className="flex border-b border-border-default">
        <button
          type="button"
          onClick={() => setOrderType("limit")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            orderType === "limit"
              ? "text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Limit
        </button>
        <button
          type="button"
          onClick={() => setOrderType("market")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            orderType === "market"
              ? "text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Market
        </button>
      </div>

      <div className="flex flex-col gap-2 xl:gap-3 p-2 xl:p-3 flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-1.5 xl:gap-2">
          <button
            type="button"
            onClick={() => setSide("LONG")}
            className={`py-2 xl:py-2.5 text-sm font-bold tracking-wide transition-all rounded-sm ${
              side === "LONG"
                ? "bg-green text-black"
                : "bg-bg-tertiary text-text-muted hover:text-green border border-border-default"
            }`}
          >
            Long
          </button>
          <button
            type="button"
            onClick={() => setSide("SHORT")}
            className={`py-2 xl:py-2.5 text-sm font-bold tracking-wide transition-all rounded-sm ${
              side === "SHORT"
                ? "bg-red text-white"
                : "bg-bg-tertiary text-text-muted hover:text-red border border-border-default"
            }`}
          >
            Short
          </button>
        </div>

        {orderType === "limit" ? (
          <Input
            label="Price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            suffix="USD"
            step="any"
          />
        ) : (
          <div className="px-3 py-2.5 bg-bg-input border border-border-default rounded-sm text-sm">
            <span className="text-text-secondary">Est. price: </span>
            <span className="font-mono text-text-primary tabular-nums">
              {perpPrice !== null ? formatPrice(perpPrice) : "--"}
            </span>
          </div>
        )}

        <Input
          label="Quantity"
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="0.00"
          step="any"
        />

        <div className="flex gap-1.5">
          {QTY_PERCENTAGES.map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => {
                const maxQty = entryPrice > 0 ? (available * leverage) / entryPrice : 0;
                if (maxQty > 0) {
                  setQty(((maxQty * pct) / 100).toFixed(4));
                }
              }}
              className="flex-1 text-xs py-1.5 bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-border-default rounded-sm transition-colors"
            >
              {pct}%
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-sm text-text-secondary font-medium">
              Leverage
            </label>
            <span className="text-sm font-mono font-bold tabular-nums text-accent">
              {leverage}&times;
            </span>
          </div>
          <input
            type="range"
            min={MIN_LEVERAGE}
            max={MAX_LEVERAGE}
            value={leverage}
            onChange={(e) => setLeverage(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between">
            {LEVERAGE_STEPS.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setLeverage(step)}
                className={`text-xs font-medium px-0.5 transition-colors ${
                  leverage === step ? "text-accent" : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {step}&times;
              </button>
            ))}
          </div>
        </div>

        {orderType === "market" && (
          <Input
            label="Slippage"
            type="number"
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            placeholder="1"
            suffix="%"
            step="any"
          />
        )}

        <div className="flex flex-col gap-2 py-2 border-t border-border-default">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Margin{orderType === "market" && entryPrice > 0 ? " (inc. slippage)" : ""}</span>
            <span className="font-mono tabular-nums text-text-primary">
              {entryPrice > 0 && qtyNum > 0 ? formatUSD(effectiveMargin) : "--"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Est. Liq</span>
            <span className="font-mono tabular-nums text-red">
              {estimatedLiqPrice > 0 ? formatPrice(estimatedLiqPrice) : "--"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Free</span>
            <span className="font-mono tabular-nums text-green">
              {formatUSD(available)}
            </span>
          </div>
        </div>

        {error && <p className="text-sm text-red font-medium">{error}</p>}

        <button
          type="submit"
          disabled={loading || qtyNum <= 0}
          className={`w-full py-3 mt-auto text-sm font-bold tracking-wide rounded-sm transition-all ${
            loading ? "opacity-60 cursor-not-allowed" : ""
          } ${
            side === "LONG"
              ? "bg-green text-black hover:brightness-110"
              : "bg-red text-white hover:brightness-110"
          }`}
        >
          {loading
            ? "Placing..."
            : `${orderType === "market" ? "Market" : "Limit"} ${side === "LONG" ? "Buy" : "Sell"} / ${side === "LONG" ? "Long" : "Short"}`}
        </button>
      </div>
    </form>
  );
}
