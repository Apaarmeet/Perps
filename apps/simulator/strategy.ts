import type { Trader } from "./setup";
import type { CreateOrderPayload } from "./types";
import type { Symbol } from "./constants";
import { request } from "./setup";

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface TradeResult {
  trader: string;
  action: "FILLED" | "PLACED" | "CANCELLED" | "FAILED";
  side: string;
  type: string;
  symbol: string;
  qty: number;
  price: number | string;
  leverage: number;
  filled: boolean;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function computeQty(price: number, leverage: number, notionalUsd: number): number {
  if (price <= 0) return 0.001;
  return +((notionalUsd * leverage) / price).toFixed(4);
}

async function place(
  trader: Trader,
  payload: CreateOrderPayload,
): Promise<{ result: any; error?: string }> {
  try {
    const result = await request("/order", {
      method: "POST",
      body: JSON.stringify(payload),
      token: trader.token,
    });
    return { result };
  } catch (err) {
    return { result: null, error: (err as Error).message };
  }
}

async function cancel(trader: Trader, orderId: string): Promise<boolean> {
  try {
    await request("/order", {
      method: "DELETE",
      body: JSON.stringify({ orderId }),
      token: trader.token,
    });
    return true;
  } catch {
    return false;
  }
}

async function getOpen(trader: Trader, symbol: string): Promise<any[]> {
  try {
    return (await request(`/orders/open/${symbol}`, {
      method: "GET",
      token: trader.token,
    })) as any[];
  } catch {
    return [];
  }
}

async function getPosition(trader: Trader, symbol: string): Promise<any | null> {
  try {
    const res = await request(`/positions/${symbol}`, {
      method: "GET",
      token: trader.token,
    }) as any;
    return res?.position || null;
  } catch {
    return null;
  }
}

// ─── 1. Market Maker (Avellaneda–Stoikov style) ─────────────
// Maintains tight 2-3 level bid/ask ladder and cancels old quotes
const MM_NOTIONAL = 2500;
const MM_LEVERAGE = 2;

async function runMarketMaker(
  trader: Trader,
  symbol: Symbol,
  midPrice: number,
  inventory: number,
): Promise<TradeResult[]> {
  const results: TradeResult[] = [];

  // 1. Cancel previous quotes to keep orderbook constant and tight
  const openOrders = await getOpen(trader, symbol);
  for (const order of openOrders) {
    const ok = await cancel(trader, order.orderId);
    if (ok) {
      results.push({
        trader: trader.email,
        action: "CANCELLED",
        side: order.side ?? "LONG",
        type: "limit",
        symbol,
        qty: order.qty ?? 0,
        price: order.price ?? "unknown",
        leverage: order.leverage ?? MM_LEVERAGE,
        filled: false,
      });
    }
  }

  // 2. Quote 2 depth levels on both sides
  const spreads = [0.0005, 0.0015]; // 0.05% and 0.15% from mid
  const skew = inventory * midPrice * 0.0005;
  const reservationPrice = midPrice - skew;

  for (let i = 0; i < spreads.length; i++) {
    const spread = midPrice * spreads[i]!;
    const bidPrice = +(reservationPrice - spread / 2).toFixed(1);
    const askPrice = +(reservationPrice + spread / 2).toFixed(1);
    const notional = MM_NOTIONAL * (1 + i * 0.5);
    const qty = computeQty(midPrice, MM_LEVERAGE, rand(notional * 0.8, notional * 1.2));

    if (qty <= 0 || bidPrice <= 0 || askPrice <= 0) continue;

    // Place Bid
    const bid = await place(trader, {
      type: "limit",
      side: "LONG",
      symbol,
      price: bidPrice,
      qty,
      leverage: MM_LEVERAGE,
      slippage: 0.5,
    });
    results.push({
      trader: trader.email,
      action: bid.error ? "FAILED" : bid.result?.order?.status === "filled" ? "FILLED" : "PLACED",
      side: "LONG",
      type: "limit",
      symbol,
      qty,
      price: bidPrice,
      leverage: MM_LEVERAGE,
      filled: bid.result?.order?.status === "filled",
      error: bid.error,
    });

    // Place Ask
    const ask = await place(trader, {
      type: "limit",
      side: "SHORT",
      symbol,
      price: askPrice,
      qty,
      leverage: MM_LEVERAGE,
      slippage: 0.5,
    });
    results.push({
      trader: trader.email,
      action: ask.error ? "FAILED" : ask.result?.order?.status === "filled" ? "FILLED" : "PLACED",
      side: "SHORT",
      type: "limit",
      symbol,
      qty,
      price: askPrice,
      leverage: MM_LEVERAGE,
      filled: ask.result?.order?.status === "filled",
      error: ask.error,
    });
  }

  return results;
}

// ─── 2. Momentum Trader ──────────────────────────────────────
const MOMENTUM_NOTIONAL = 4000;
const MOMENTUM_LEVERAGES = [3, 5, 10];

async function runMomentum(
  trader: Trader,
  symbol: Symbol,
  midPrice: number,
  trend: number,
): Promise<TradeResult[]> {
  const results: TradeResult[] = [];

  // Check if position exists and can be closed/taken profit
  const pos = await getPosition(trader, symbol);
  if (pos && pos.qty > 0 && Math.random() < 0.4) {
    const exitSide = pos.side === "LONG" ? "SHORT" : "LONG";
    const exit = await place(trader, {
      type: "market",
      side: exitSide,
      symbol,
      price: null,
      qty: pos.qty,
      leverage: pos.leverage || 5,
      slippage: 1,
    });
    results.push({
      trader: trader.email,
      action: exit.error ? "FAILED" : "FILLED",
      side: exitSide,
      type: "market (EXIT)",
      symbol,
      qty: pos.qty,
      price: "market",
      leverage: pos.leverage || 5,
      filled: !exit.error,
      error: exit.error,
    });
    return results;
  }

  const side = trend > 0.0005 ? "LONG" : trend < -0.0005 ? "SHORT" : pick(["LONG", "SHORT"] as const);
  const leverage = pick(MOMENTUM_LEVERAGES);
  const qty = computeQty(midPrice, leverage, rand(MOMENTUM_NOTIONAL * 0.5, MOMENTUM_NOTIONAL * 1.5));

  // 60% market order to cross the spread and generate fills
  const isMarket = Math.random() < 0.6;
  if (isMarket) {
    const mkt = await place(trader, {
      type: "market",
      side,
      symbol,
      price: null,
      qty,
      leverage,
      slippage: 1,
    });
    results.push({
      trader: trader.email,
      action: mkt.error ? "FAILED" : "FILLED",
      side,
      type: "market",
      symbol,
      qty,
      price: "market",
      leverage,
      filled: !mkt.error,
      error: mkt.error,
    });
  } else {
    const offset = midPrice * 0.0003;
    const limitPrice = side === "LONG" ? +(midPrice + offset).toFixed(1) : +(midPrice - offset).toFixed(1);
    const limit = await place(trader, {
      type: "limit",
      side,
      symbol,
      price: limitPrice,
      qty,
      leverage,
      slippage: 0.5,
    });
    results.push({
      trader: trader.email,
      action: limit.error ? "FAILED" : limit.result?.order?.status === "filled" ? "FILLED" : "PLACED",
      side,
      type: "limit",
      symbol,
      qty,
      price: limitPrice,
      leverage,
      filled: limit.result?.order?.status === "filled",
      error: limit.error,
    });
  }

  return results;
}

// ─── 3. Mean Reversion Trader ────────────────────────────────
const REVERSION_NOTIONAL = 3000;
const REVERSION_LEVERAGES = [2, 3, 5];

async function runReversion(
  trader: Trader,
  symbol: Symbol,
  midPrice: number,
  deviation: number,
): Promise<TradeResult[]> {
  const results: TradeResult[] = [];

  const pos = await getPosition(trader, symbol);
  if (pos && pos.qty > 0 && Math.random() < 0.4) {
    const exitSide = pos.side === "LONG" ? "SHORT" : "LONG";
    const exit = await place(trader, {
      type: "market",
      side: exitSide,
      symbol,
      price: null,
      qty: pos.qty,
      leverage: pos.leverage || 3,
      slippage: 1,
    });
    results.push({
      trader: trader.email,
      action: exit.error ? "FAILED" : "FILLED",
      side: exitSide,
      type: "market (EXIT)",
      symbol,
      qty: pos.qty,
      price: "market",
      leverage: pos.leverage || 3,
      filled: !exit.error,
      error: exit.error,
    });
    return results;
  }

  const side = deviation > 0.01 ? "SHORT" : "LONG";
  const leverage = pick(REVERSION_LEVERAGES);
  const qty = computeQty(midPrice, leverage, rand(REVERSION_NOTIONAL * 0.5, REVERSION_NOTIONAL * 1.5));

  const offset = midPrice * 0.002;
  const limitPrice = side === "LONG" ? +(midPrice - offset).toFixed(1) : +(midPrice + offset).toFixed(1);

  const { result, error } = await place(trader, {
    type: "limit",
    side,
    symbol,
    price: limitPrice,
    qty,
    leverage,
    slippage: 0.5,
  });

  results.push({
    trader: trader.email,
    action: error ? "FAILED" : result?.order?.status === "filled" ? "FILLED" : "PLACED",
    side,
    type: "limit",
    symbol,
    qty,
    price: limitPrice,
    leverage,
    filled: result?.order?.status === "filled",
    error,
  });

  return results;
}

// ─── 4. Scalper ──────────────────────────────────────────────
const SCALP_NOTIONAL = 2000;
const SCALP_LEVERAGES = [5, 10, 15];

async function runScalp(
  trader: Trader,
  symbol: Symbol,
  midPrice: number,
): Promise<TradeResult[]> {
  const results: TradeResult[] = [];
  const direction = pick(["LONG", "SHORT"] as const);
  const leverage = pick(SCALP_LEVERAGES);
  const qty = computeQty(midPrice, leverage, rand(SCALP_NOTIONAL, SCALP_NOTIONAL * 2));

  const entry = await place(trader, {
    type: "market",
    side: direction,
    symbol,
    price: null,
    qty,
    leverage,
    slippage: 1,
  });

  results.push({
    trader: trader.email,
    action: entry.error ? "FAILED" : "FILLED",
    side: direction,
    type: "market",
    symbol,
    qty,
    price: "market",
    leverage,
    filled: !entry.error,
    error: entry.error,
  });

  return results;
}

async function runScalpExit(
  trader: Trader,
  symbol: Symbol,
  midPrice: number,
  entrySide: string,
  entryQty: number,
  leverage: number,
): Promise<TradeResult> {
  const exitSide = entrySide === "LONG" ? "SHORT" : "LONG";

  const exit = await place(trader, {
    type: "market",
    side: exitSide,
    symbol,
    price: null,
    qty: entryQty,
    leverage,
    slippage: 1,
  });

  return {
    trader: trader.email,
    action: exit.error ? "FAILED" : "FILLED",
    side: exitSide,
    type: "market (EXIT)",
    symbol,
    qty: entryQty,
    price: "market",
    leverage,
    filled: !exit.error,
    error: exit.error,
  };
}

// ─── 5. Retail Trader ────────────────────────────────────────
const RETAIL_NOTIONAL = 800;
const RETAIL_LEVERAGES = [1, 2, 3];

async function runRetail(
  trader: Trader,
  symbol: Symbol,
  midPrice: number,
): Promise<TradeResult[]> {
  const results: TradeResult[] = [];

  // Check if position exists and close occasionally
  const pos = await getPosition(trader, symbol);
  if (pos && pos.qty > 0 && Math.random() < 0.5) {
    const exitSide = pos.side === "LONG" ? "SHORT" : "LONG";
    const exit = await place(trader, {
      type: "market",
      side: exitSide,
      symbol,
      price: null,
      qty: pos.qty,
      leverage: pos.leverage || 2,
      slippage: 1,
    });
    results.push({
      trader: trader.email,
      action: exit.error ? "FAILED" : "FILLED",
      side: exitSide,
      type: "market (EXIT)",
      symbol,
      qty: pos.qty,
      price: "market",
      leverage: pos.leverage || 2,
      filled: !exit.error,
      error: exit.error,
    });
    return results;
  }

  const side = pick(["LONG", "SHORT"] as const);
  const leverage = pick(RETAIL_LEVERAGES);
  const qty = computeQty(midPrice, leverage, rand(RETAIL_NOTIONAL * 0.4, RETAIL_NOTIONAL * 1.5));

  // 60% Market order, 40% Limit
  const isMarket = Math.random() < 0.6;
  if (isMarket) {
    const res = await place(trader, {
      type: "market",
      side,
      symbol,
      price: null,
      qty,
      leverage,
      slippage: 1,
    });
    results.push({
      trader: trader.email,
      action: res.error ? "FAILED" : "FILLED",
      side,
      type: "market",
      symbol,
      qty,
      price: "market",
      leverage,
      filled: !res.error,
      error: res.error,
    });
  } else {
    const offset = midPrice * rand(0.0005, 0.002);
    const limitPrice = side === "LONG" ? +(midPrice - offset).toFixed(1) : +(midPrice + offset).toFixed(1);
    const res = await place(trader, {
      type: "limit",
      side,
      symbol,
      price: limitPrice,
      qty,
      leverage,
      slippage: 0.5,
    });
    results.push({
      trader: trader.email,
      action: res.error ? "FAILED" : res.result?.order?.status === "filled" ? "FILLED" : "PLACED",
      side,
      type: "limit",
      symbol,
      qty,
      price: limitPrice,
      leverage,
      filled: res.result?.order?.status === "filled",
      error: res.error,
    });
  }

  return results;
}

// ─── Public entry points ─────────────────────────────────────

export async function runStrategy(
  trader: Trader,
  symbol: Symbol,
  midPrice: number,
  traderIndex: number,
  extra: { trend?: number; deviation?: number; inventory?: number } = {},
): Promise<TradeResult[]> {
  switch (traderIndex) {
    case 0:
    case 1:
    case 2:
    case 3:
      return runMarketMaker(trader, symbol, midPrice, extra.inventory ?? 0);
    case 4:
    case 5:
      return runMomentum(trader, symbol, midPrice, extra.trend ?? 0);
    case 6:
    case 7:
      return runReversion(trader, symbol, midPrice, extra.deviation ?? 0);
    case 8:
      return runScalp(trader, symbol, midPrice);
    case 9:
    default:
      return runRetail(trader, symbol, midPrice);
  }
}

export async function runExit(
  trader: Trader,
  symbol: Symbol,
  midPrice: number,
  traderIndex: number,
  entrySide: string,
  entryQty: number,
  leverage: number,
): Promise<TradeResult> {
  return runScalpExit(trader, symbol, midPrice, entrySide, entryQty, leverage);
}

export async function cancelStaleOrders(
  trader: Trader,
  symbol: Symbol,
  traderIndex: number,
): Promise<TradeResult[]> {
  const openOrders = await getOpen(trader, symbol);
  if (openOrders.length <= 2) return [];

  const results: TradeResult[] = [];
  // Cancel older orders exceeding 2 open orders per trader
  for (const order of openOrders.slice(2)) {
    const ok = await cancel(trader, order.orderId);
    if (ok) {
      results.push({
        trader: trader.email,
        action: "CANCELLED",
        side: order.side ?? "LONG",
        type: "limit",
        symbol,
        qty: order.qty ?? 0,
        price: order.price ?? "unknown",
        leverage: order.leverage ?? 1,
        filled: false,
      });
    }
  }
  return results;
}
