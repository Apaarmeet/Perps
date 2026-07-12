"use client";

import { useState } from "react";
import { useBalance } from "@/hooks/useBalance";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { formatUSD } from "@/lib/format";
import { Plus } from "lucide-react";

export function BalanceBar() {
  const { available, locked, total, isLoading, refetch } = useBalance();
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDeposit() {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;

    setLoading(true);
    try {
      await api.post("/onRamp", { amount: amt });
      setAmount("");
      setModalOpen(false);
      refetch();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-text-muted">Equity</span>
          <span className="font-mono font-medium text-text-primary tabular-nums">
            {isLoading ? "--" : formatUSD(total)}
          </span>
        </div>
        <Button variant="ghost" className="text-xs !px-2 !py-1" onClick={() => setModalOpen(true)}>
          <Plus className="w-3 h-3" />
          Deposit
        </Button>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Deposit USD">
        <div className="flex flex-col gap-4">
          <Input
            label="Amount (USD)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
            min="0"
            step="any"
          />
          <Button onClick={handleDeposit} disabled={loading} className="w-full">
            {loading ? "Depositing..." : "Deposit"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
