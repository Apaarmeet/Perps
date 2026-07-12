"use client";

import { ChartPanel } from "@/components/trading/ChartPanel";
import { OrderbookPanel } from "@/components/trading/OrderbookPanel";
import { OrderForm } from "@/components/trading/OrderForm";
import { PositionsTable } from "@/components/trading/PositionsTable";
import { OpenOrdersTable } from "@/components/trading/OpenOrdersTable";
import { OrderHistoryTable } from "@/components/trading/OrderHistoryTable";
import { Tabs } from "@/components/ui/Tabs";
import { useState } from "react";

const BOTTOM_TABS = [
  { id: "positions", label: "Positions" },
  { id: "open-orders", label: "Open Orders" },
  { id: "history", label: "History" },
];

export default function TradePage() {
  const [bottomTab, setBottomTab] = useState("positions");

  return (
    <div className="flex flex-col h-full gap-1 p-1">
      <div className="flex-1 grid grid-cols-[300px_1fr_280px] gap-1 min-h-0">
        <OrderForm />
        <ChartPanel />
        <OrderbookPanel />
      </div>

      <div className="h-[40%] min-h-[200px] bg-bg-secondary border border-border-default flex flex-col">
        <div className="border-b border-border-default">
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
