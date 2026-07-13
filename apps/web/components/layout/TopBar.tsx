"use client";

import { MarketSelector } from "./MarketSelector";
import { LastPrice } from "@/components/trading/LastPrice";
import { BalanceBar } from "@/components/trading/BalanceBar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { usePositions } from "@/hooks/usePositions";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { formatUSD } from "@/lib/format";
import { User, LogOut } from "lucide-react";

export function TopBar() {
  const { user, logout } = useAuth();
  const { positions } = usePositions();
  const { indexPrice } = usePriceFeed();

  const unrealizedPnl = positions.reduce((sum, pos) => {
    const idx = indexPrice ?? pos.averagePrice;
    return pos.side === "LONG"
      ? sum + (idx - pos.averagePrice) * pos.qty
      : sum + (pos.averagePrice - idx) * pos.qty;
  }, 0);

  return (
    <header className="h-10 bg-bg-secondary border-b border-border-default flex items-center px-2 xl:px-3 gap-2 xl:gap-3 shrink-0 select-none">
      <span className="text-base font-bold text-text-primary tracking-tight hidden sm:inline">
        Coinbook
      </span>

      <div className="h-5 w-px bg-border-default hidden sm:block" />

      <MarketSelector />

      <div className="hidden xl:block flex-1" />

      <div className="flex items-center gap-4 mx-auto">
        <LastPrice />
      </div>

      {unrealizedPnl !== 0 && (
        <div className={`hidden md:block text-sm font-mono tabular-nums font-medium ${unrealizedPnl >= 0 ? "text-green" : "text-red"}`}>
          {unrealizedPnl >= 0 ? "+" : ""}{formatUSD(unrealizedPnl)}
        </div>
      )}

      <div className="hidden xl:block flex-1" />

      <BalanceBar />

      <div className="h-5 w-px bg-border-default hidden sm:block" />

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 text-sm text-text-secondary">
          <User className="w-3.5 h-3.5" />
          <span className="max-w-[80px] xl:max-w-[120px] truncate">{user?.email ?? "..."}</span>
        </div>
        <Button variant="ghost" onClick={logout} className="!px-1.5 !py-1.5">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
