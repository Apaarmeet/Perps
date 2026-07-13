import type { Trader } from "./setup";
import type { CreateOrderPayload } from "./types";
import type { Symbol } from "./constants";
import { request } from "./setup";

const LEVERAGES = [1, 2, 3, 5, 10, 15, 20];
const MARGIN_PCT_RANGE = [0.02, 0.25] as const;
const TOTAL_MARGIN = 100000;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function coinFlip(): boolean {
  return Math.random() > 0.5;
}

// qty is USD notional; margin = (price * qty) / leverage
// so qty = (margin * leverage) / price
function computeQty(price: number, leverage: number): number {
  const marginPct = rand(MARGIN_PCT_RANGE[0], MARGIN_PCT_RANGE[1]);
  const margin = TOTAL_MARGIN * marginPct;
  return +((margin * leverage) / price).toFixed(4);
}

export interface TradeResult {
  trader: string;
  action: string;
  side: string;
  type: string;
  symbol: string;
  qty: number;
  price: number | string;
  leverage: number;
  filled: boolean;
  error?: string;
}

export async function placeRandomOrder(
  trader: Trader,
  symbol: Symbol,
  currentPrice: number
): Promise<TradeResult> {
  const type = coinFlip() ? "market" : "limit";
  const side = coinFlip() ? "LONG" : "SHORT";
  const leverage = pick(LEVERAGES);
  const qty = computeQty(currentPrice, leverage);
  const slippage = 1 + rand(0, 2);

  const limitPrice = type === "limit"
    ? +(currentPrice * (side === "LONG" ? rand(0.995, 0.999) : rand(1.001, 1.005))).toFixed(1)
    : null;

  try {
    const payload: CreateOrderPayload = {
      type,
      side,
      symbol,
      price: limitPrice,
      qty,
      leverage,
      slippage: slippage,
    };

    const result = await request("/order", {
      method: "POST",
      body: JSON.stringify(payload),
      token: trader.token,
    }) as any;

    const status = result.order?.status ?? "unknown";
    const filled = status === "filled";

    return {
      trader: trader.email,
      action: filled ? "FILLED" : "PLACED",
      side,
      type,
      symbol,
      qty,
      price: limitPrice ?? "market",
      leverage,
      filled,
    };
  } catch (err) {
    return {
      trader: trader.email,
      action: "FAILED",
      side,
      type,
      symbol,
      qty,
      price: limitPrice ?? "market",
      leverage,
      filled: false,
      error: (err as Error).message,
    };
  }
}

export async function aggroScalp(
  trader: Trader,
  symbol: Symbol,
  currentPrice: number
): Promise<TradeResult[]> {
  const results: TradeResult[] = [];
  const direction = coinFlip() ? "LONG" : "SHORT";
  const leverage = pick([10, 15, 20]);
  const qty = computeQty(currentPrice, leverage) * 1.5;

  const r = await placeOrder(trader, symbol, currentPrice, direction, qty, leverage);
  results.push(r);

  await sleep(Math.random() * 2000 + 500);

  const exitSide = direction === "LONG" ? "SHORT" : "LONG";
  const exit = await placeOrder(trader, symbol, currentPrice, exitSide, qty, leverage);
  results.push(exit);

  return results;
}

async function placeOrder(
  trader: Trader,
  symbol: Symbol,
  currentPrice: number,
  side: string,
  qty: number,
  leverage: number
): Promise<TradeResult> {
  try {
    const payload: CreateOrderPayload = {
      type: "market",
      side: side as "LONG" | "SHORT",
      symbol,
      price: null,
      qty,
      leverage,
      slippage: 1,
    };

    const result = await request("/order", {
      method: "POST",
      body: JSON.stringify(payload),
      token: trader.token,
    }) as any;

    return {
      trader: trader.email,
      action: result.order?.status === "filled" ? "FILLED" : "PLACED",
      side,
      type: "market",
      symbol,
      qty,
      price: "market",
      leverage,
      filled: result.order?.status === "filled",
    };
  } catch (err) {
    return {
      trader: trader.email,
      action: "FAILED",
      side,
      type: "market",
      symbol,
      qty,
      price: "market",
      leverage,
      filled: false,
      error: (err as Error).message,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
