"use client";

import { MarketSelector } from "./MarketSelector";
import { LastPrice } from "@/components/trading/LastPrice";
import { BalanceBar } from "@/components/trading/BalanceBar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { LogOut } from "lucide-react";

export function TopBar() {
  const { logout } = useAuth();

  return (
    <header className="h-12 bg-bg-secondary border-b border-border-default flex items-center px-4 gap-4 shrink-0">
      <span className="text-sm font-semibold text-text-primary tracking-tight mr-2">
        Coinbook
      </span>

      <MarketSelector />

      <div className="flex-1 flex justify-center">
        <LastPrice />
      </div>

      <BalanceBar />

      <Button variant="ghost" onClick={logout} className="text-xs">
        <LogOut className="w-3.5 h-3.5" />
      </Button>
    </header>
  );
}
