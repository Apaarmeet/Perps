"use client";

import { useRef, useCallback, useState } from "react";
import { ChartPanel } from "@/components/trading/ChartPanel";
import { OrderbookPanel } from "@/components/trading/OrderbookPanel";
import { OrderForm } from "@/components/trading/OrderForm";
import { PositionsTable } from "@/components/trading/PositionsTable";
import { OpenOrdersTable } from "@/components/trading/OpenOrdersTable";
import { OrderHistoryTable } from "@/components/trading/OrderHistoryTable";
import { Tabs } from "@/components/ui/Tabs";
import { X } from "lucide-react";

const BOTTOM_TABS = [
  { id: "positions", label: "Positions" },
  { id: "open-orders", label: "Open Orders" },
  { id: "history", label: "History" },
];

export default function TradePage() {
  const [bottomTab, setBottomTab] = useState("positions");
  const [mobilePanel, setMobilePanel] = useState<string | null>(null);
  const setOrderPriceRef = useRef<((p: number) => void) | null>(null);

  const handlePriceClick = useCallback((price: number) => {
    setOrderPriceRef.current?.(price);
  }, []);

  const PANELS = [
    { id: "chart", label: "Chart" },
    { id: "orderform", label: "Trade" },
    { id: "orderbook", label: "Book" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Mobile panel selector */}
      <div className="flex xl:hidden gap-px bg-bg-secondary border-b border-border-default shrink-0">
        {PANELS.map((p) => (
          <button
            key={p.id}
            onClick={() => setMobilePanel(mobilePanel === p.id ? null : p.id)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mobilePanel === p.id
                ? "bg-bg-primary text-text-primary"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[18%_1fr_20%] min-h-0">
        {/* OrderForm */}
        <div className={`${mobilePanel && mobilePanel !== "orderform" ? "hidden" : "flex"} xl:flex flex-col min-h-0 ${
          mobilePanel === "orderform" ? "fixed inset-0 z-30 bg-bg-primary" : ""
        }`}>
          <OrderForm setPriceRef={setOrderPriceRef} />
          {mobilePanel === "orderform" && (
            <button
              onClick={() => setMobilePanel(null)}
              className="absolute top-3 right-3 p-2 text-text-muted hover:text-text-primary bg-bg-secondary border border-border-default rounded-sm"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Chart */}
        <div className={`${mobilePanel && mobilePanel !== "chart" ? "hidden" : "flex"} xl:flex flex-col min-h-0 ${
          mobilePanel === "chart" ? "fixed inset-0 z-30 bg-bg-primary" : ""
        }`}>
          <ChartPanel />
          {mobilePanel === "chart" && (
            <button
              onClick={() => setMobilePanel(null)}
              className="absolute top-3 right-3 p-2 text-text-muted hover:text-text-primary bg-bg-secondary border border-border-default rounded-sm z-40"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Orderbook */}
        <div className={`${mobilePanel && mobilePanel !== "orderbook" ? "hidden" : "flex"} xl:flex flex-col min-h-0 ${
          mobilePanel === "orderbook" ? "fixed inset-0 z-30 bg-bg-primary" : ""
        }`}>
          <OrderbookPanel onPriceClick={handlePriceClick} />
          {mobilePanel === "orderbook" && (
            <button
              onClick={() => setMobilePanel(null)}
              className="absolute top-3 right-3 p-2 text-text-muted hover:text-text-primary bg-bg-secondary border border-border-default rounded-sm"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom panels */}
      <div className="h-[30%] min-h-[160px] bg-bg-secondary border-t border-border-default flex flex-col">
        <div className="px-3 border-b border-border-default">
          <Tabs tabs={BOTTOM_TABS} active={bottomTab} onChange={setBottomTab} />
        </div>
        <div className="flex-1 overflow-auto">
          {bottomTab === "positions" && <PositionsTable />}
          {bottomTab === "open-orders" && <OpenOrdersTable />}
          {bottomTab === "history" && <OrderHistoryTable />}
        </div>
      </div>
    </div>
  );
}
