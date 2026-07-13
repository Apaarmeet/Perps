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

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
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
  return +((notionalUsd * leverage) / price).toFixed(6);
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

// ─── 1. Market Maker (Avellaneda–Stoikov style) ─────────────
// Places bid + ask around mid-price with inventory-skewed reservation price
// Cancels stale orders and re-quotes periodically
const MM_NOTIONAL = 2000;
const MM_LEVERAGE = 2;

async function runMarketMaker(
  trader: Trader,
  symbol: Symbol,
  midPrice: number,
  inventory: number,  // positive = net long, negative = net short
): Promise<TradeResult[]> {
  const results: TradeResult[] = [];

  // Reservation price shifts based on inventory (skew toward flat)
  // inventory = 0 → reservation = midPrice
  // inventory = +1 BTC → reservation shifts down to encourage selling
  const spread = midPrice * pick([0.0008, 0.001, 0.0015, 0.002]);
  const skew = inventory * midPrice * 0.0005;  // 0.05% per BTC inventory
  const reservationPrice = midPrice - skew;

  const bidPrice = +(reservationPrice - spread / 2).toFixed(1);
  const askPrice = +(reservationPrice + spread / 2).toFixed(1);
  const qty = computeQty(midPrice, MM_LEVERAGE, rand(MM_NOTIONAL * 0.5, MM_NOTIONAL * 1.5));

  // Place bid
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

  // Place ask
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

  return results;
}

async function cancelStaleMM(trader: Trader, symbol: Symbol): Promise<TradeResult[]> {
  const results: TradeResult[] = [];
  const orders = await getOpen(trader, symbol);

  for (const order of orders.slice(0, 4)) {
    const ok = await cancel(trader, order.orderId);
    results.push({
      trader: trader.email,
      action: ok ? "CANCELLED" : "FAILED",
      side: order.side ?? "LONG",
      type: "limit",
      symbol,
      qty: order.qty ?? 0,
      price: order.price ?? "unknown",
      leverage: order.leverage ?? 1,
      filled: false,
      error: ok ? undefined : "cancel failed",
    });
  }

  return results;
}

// ─── 2. Momentum Trader ──────────────────────────────────────
// Tracks short-term trend. Uses limit orders to add depth.
// Tight offset so they often get filled, acting like aggressive makers.
const MOMENTUM_NOTIONAL = 5000;
const MOMENTUM_LEVERAGES = [3, 5, 10];

async function runMomentum(
  trader: Trader,
  symbol: Symbol,
  midPrice: number,
  trend: number,  // positive = uptrend, negative = downtrend
): Promise<TradeResult> {
  // Only follow trend if it's significant; otherwise random
  const side =
    trend > 0.001 ? "LONG" :
    trend < -0.001 ? "SHORT" :
    pick(["LONG", "SHORT"] as const);
  const leverage = pick(MOMENTUM_LEVERAGES);
  const qty = computeQty(midPrice, leverage, rand(MOMENTUM_NOTIONAL * 0.5, MOMENTUM_NOTIONAL * 1.5));

  // Limit at 0.05% offset — aggressive, adds depth, often gets filled
  const offset = midPrice * 0.0005;
  const limitPrice = side === "LONG"
    ? +(midPrice + offset).toFixed(1)   // slightly above mid to get filled
    : +(midPrice - offset).toFixed(1);  // slightly below mid to get filled

  const { result, error } = await place(trader, {
    type: "limit",
    side,
    symbol,
    price: limitPrice,
    qty,
    leverage,
    slippage: 0.5,
  });

  return {
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
  };
}

// ─── 3. Mean Reversion Trader ────────────────────────────────
// Buys when price is below MA, sells when above.
// Uses limit orders at a discount/premium to mid.
const REVERSION_NOTIONAL = 3000;
const REVERSION_LEVERAGES = [2, 3, 5];

async function runReversion(
  trader: Trader,
  symbol: Symbol,
  midPrice: number,
  deviation: number,  // percent deviation from MA. positive = price above MA
): Promise<TradeResult> {
  // deviation > 2% → sell (price too high, expect reversion down)
  // deviation < -2% → buy (price too low, expect reversion up)
  const shouldSell = deviation > 0.02;
  const shouldBuy = deviation < -0.02;

  if (!shouldSell && !shouldBuy) {
    return {
      trader: trader.email,
      action: "PLACED",
      side: "NONE",
      type: "none",
      symbol,
      qty: 0,
      price: "none",
      leverage: 1,
      filled: false,
    };
  }

  const side = shouldSell ? "SHORT" : "LONG";
  const leverage = pick(REVERSION_LEVERAGES);

  // Place limit order away from mid to get filled on a retrace
  const offset = midPrice * 0.003;  // 0.3% away
  const limitPrice = side === "LONG"
    ? +(midPrice - offset).toFixed(1)
    : +(midPrice + offset).toFixed(1);
  const qty = computeQty(midPrice, leverage, rand(REVERSION_NOTIONAL * 0.5, REVERSION_NOTIONAL * 1.5));

  const { result, error } = await place(trader, {
    type: "limit",
    side,
    symbol,
    price: limitPrice,
    qty,
    leverage,
    slippage: 0.5,
  });

  return {
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
  };
}

// ─── 4. Scalper ──────────────────────────────────────────────
// Quick in-and-out with limit orders (adds depth, may get filled)
const SCALP_NOTIONAL = 2000;
const SCALP_LEVERAGES = [10, 15, 20];

async function runScalp(
  trader: Trader,
  symbol: Symbol,
  midPrice: number,
): Promise<TradeResult[]> {
  const results: TradeResult[] = [];
  const direction = pick(["LONG", "SHORT"] as const);
  const leverage = pick(SCALP_LEVERAGES);
  const qty = computeQty(midPrice, leverage, rand(SCALP_NOTIONAL, SCALP_NOTIONAL * 2));

  // Enter with limit at tight 0.04% offset
  const offset = midPrice * 0.0004;
  const entryPrice = direction === "LONG"
    ? +(midPrice + offset).toFixed(1)
    : +(midPrice - offset).toFixed(1);

  const entry = await place(trader, {
    type: "limit",
    side: direction,
    symbol,
    price: entryPrice,
    qty,
    leverage,
    slippage: 0.5,
  });
  results.push({
    trader: trader.email,
    action: entry.error ? "FAILED" : entry.result?.order?.status === "filled" ? "FILLED" : "PLACED",
    side: direction,
    type: "limit",
    symbol,
    qty,
    price: entryPrice,
    leverage,
    filled: entry.result?.order?.status === "filled",
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
  const offset = midPrice * 0.0004;
  const exitPrice = exitSide === "LONG"
    ? +(midPrice + offset).toFixed(1)
    : +(midPrice - offset).toFixed(1);

  const exit = await place(trader, {
    type: "limit",
    side: exitSide,
    symbol,
    price: exitPrice,
    qty: entryQty,
    leverage,
    slippage: 0.5,
  });

  return {
    trader: trader.email,
    action: exit.error ? "FAILED" : exit.result?.order?.status === "filled" ? "FILLED" : "PLACED",
    side: exitSide,
    type: "limit",
    symbol,
    qty: entryQty,
    price: exitPrice,
    leverage,
    filled: exit.result?.order?.status === "filled",
    error: exit.error,
  };
}

// ─── 5. Retail Trader ────────────────────────────────────────
// Random small orders, mostly market, small sizes
const RETAIL_NOTIONAL = 500;
const RETAIL_LEVERAGES = [1, 2, 3];

async function runRetail(
  trader: Trader,
  symbol: Symbol,
  midPrice: number,
): Promise<TradeResult> {
  const isLimit = Math.random() < 0.7;  // 70% limit adds depth, 30% market for occasional fills
  const side = pick(["LONG", "SHORT"] as const);
  const leverage = pick(RETAIL_LEVERAGES);
  const qty = computeQty(midPrice, leverage, rand(RETAIL_NOTIONAL * 0.3, RETAIL_NOTIONAL * 2));

  if (isLimit) {
    const offset = midPrice * rand(0.001, 0.005);
    const limitPrice = side === "LONG"
      ? +(midPrice - offset).toFixed(1)
      : +(midPrice + offset).toFixed(1);

    const { result, error } = await place(trader, {
      type: "limit",
      side,
      symbol,
      price: limitPrice,
      qty,
      leverage,
      slippage: 0.5,
    });

    return {
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
    };
  }

  const { result, error } = await place(trader, {
    type: "market",
    side,
    symbol,
    price: null,
    qty,
    leverage,
    slippage: pick([0.3, 0.5, 1]),
  });

  return {
    trader: trader.email,
    action: error ? "FAILED" : "FILLED",
    side,
    type: "market",
    symbol,
    qty,
    price: "market",
    leverage,
    filled: !error,
    error,
  };
}

// ─── Public entry points ─────────────────────────────────────

export async function runStrategy(
  trader: Trader,
  symbol: Symbol,
  midPrice: number,
  traderIndex: number,
  extra: { trend?: number; deviation?: number; inventory?: number } = {},
): Promise<TradeResult | TradeResult[]> {
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
      return runRetail(trader, symbol, midPrice);
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
  if (traderIndex < 4) {
    return cancelStaleMM(trader, symbol);
  }
  return [];
}
