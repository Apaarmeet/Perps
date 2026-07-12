"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useMarket } from "@/context/MarketContext";
import { useBalance } from "@/hooks/useBalance";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import {
  DEFAULT_LEVERAGE,
  MIN_LEVERAGE,
  MAX_LEVERAGE,
  LEVERAGE_STEPS,
  QTY_PERCENTAGES,
} from "@/lib/constants";
import { formatUSD, formatPrice } from "@/lib/format";
import type { OrderType, Side } from "@/types/trading";

export function OrderForm() {
  const { market } = useMarket();
  const { available, refetch: refetchBalance } = useBalance();

  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [side, setSide] = useState<Side>("LONG");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);
  const [slippage, setSlippage] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const priceNum = parseFloat(price) || 0;
  const qtyNum = parseFloat(qty) || 0;
  const slippageNum = parseFloat(slippage) || 0;

  const margin = qtyNum > 0 ? qtyNum / leverage : 0;

  const estimatedLiqPrice = (() => {
    if (qtyNum <= 0 || leverage <= 0) return 0;
    const entryPrice = priceNum || 0;
    if (entryPrice <= 0) return 0;
    const liqThreshold = entryPrice * (1 / leverage);
    return side === "LONG"
      ? entryPrice - liqThreshold
      : entryPrice + liqThreshold;
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
    if (margin > available) {
      setError("Insufficient balance");
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
        sllipage: slippageNum,
      });
      setPrice("");
      setQty("");
      refetchBalance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col h-full bg-bg-secondary border border-border-default"
    >
      <div className="border-b border-border-default">
        <Tabs
          tabs={[
            { id: "limit", label: "Limit" },
            { id: "market", label: "Market" },
          ]}
          active={orderType}
          onChange={(id) => setOrderType(id as OrderType)}
        />
      </div>

      <div className="flex flex-col gap-3 p-3 flex-1">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={side === "LONG" ? "primary" : "ghost"}
            onClick={() => setSide("LONG")}
            className={`flex-1 text-xs ${
              side === "LONG"
                ? "!bg-green !border-green !text-black font-semibold"
                : ""
            }`}
          >
            Long
          </Button>
          <Button
            type="button"
            variant={side === "SHORT" ? "primary" : "ghost"}
            onClick={() => setSide("SHORT")}
            className={`flex-1 text-xs ${
              side === "SHORT"
                ? "!bg-red !border-red !text-white font-semibold"
                : ""
            }`}
          >
            Short
          </Button>
        </div>

        {orderType === "limit" && (
          <Input
            label="Price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            suffix="USD"
            step="any"
          />
        )}

        <Input
          label="Quantity"
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="0.00"
          suffix="USD"
          step="any"
        />

        <div className="flex gap-1">
          {QTY_PERCENTAGES.map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => {
                if (available > 0) {
                  setQty(
                    (((available * leverage * pct) / 100) / (priceNum || 1)).toFixed(
                      4
                    )
                  );
                }
              }}
              className="flex-1 text-[10px] py-1 bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default transition-colors"
            >
              {pct}%
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-secondary font-medium">
            Leverage: {leverage}x
          </label>
          <input
            type="range"
            min={MIN_LEVERAGE}
            max={MAX_LEVERAGE}
            value={leverage}
            onChange={(e) => setLeverage(parseInt(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex justify-between">
            {LEVERAGE_STEPS.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setLeverage(step)}
                className={`text-[10px] px-1 ${
                  leverage === step ? "text-accent" : "text-text-muted"
                }`}
              >
                {step}x
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

        <div className="flex flex-col gap-1 py-2 border-t border-border-default">
          <div className="flex justify-between text-xs">
            <span className="text-text-secondary">Margin</span>
            <span className="font-mono tabular-nums text-text-primary">
              {formatUSD(margin)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-secondary">Est. Liq. Price</span>
            <span className="font-mono tabular-nums text-red">
              {estimatedLiqPrice > 0 ? formatPrice(estimatedLiqPrice) : "--"}
            </span>
          </div>
        </div>

        {error && <p className="text-xs text-red">{error}</p>}

        <Button
          type="submit"
          disabled={loading || qtyNum <= 0}
          className={`w-full mt-auto ${
            side === "LONG"
              ? "!bg-green !border-green !text-black font-semibold"
              : "!bg-red !border-red !text-white font-semibold"
          }`}
        >
          {loading
            ? "Placing..."
            : side === "LONG"
            ? `Buy / Long`
            : `Sell / Short`}
        </Button>
      </div>
    </form>
  );
}
