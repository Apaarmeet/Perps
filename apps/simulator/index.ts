import { seedTraders } from "./setup";
import { runStrategy, runExit, cancelStaleOrders } from "./strategy";
import { getPriceOrWarn } from "./priceClient";
import type { Symbol } from "./constants";
import type { Trader } from "./setup";

const TRADER_NAMES = [
  "mm1", "mm2", "mm3", "mm4",
  "momentum1", "momentum2",
  "reversion1", "reversion2",
  "scalper",
  "retail",
];

const TRADER_LABELS = [
  "MM1", "MM2", "MM3", "MM4",
  "MOM1", "MOM2",
  "REV1", "REV2",
  "SCALP",
  "RETAIL",
];

const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function log(emoji: string, color: string, trader: string, msg: string) {
  const t = new Date().toLocaleTimeString();
  console.log(
    `${colors.dim}${t}${colors.reset} ${color}${emoji}${colors.reset} ${colors.bold}${trader}${colors.reset} ${msg}`,
  );
}

// ─── Price history for trend/deviation ───────────────────────
const priceHistory: Record<string, number[]> = {};
const MA_SHORT = 20;
const MA_LONG = 120;

function recordPrice(symbol: string, price: number) {
  if (!priceHistory[symbol]) priceHistory[symbol] = [];
  priceHistory[symbol].push(price);
  if (priceHistory[symbol].length > MA_LONG) {
    priceHistory[symbol].shift();
  }
}

function getTrend(symbol: string): number {
  const h = priceHistory[symbol];
  if (!h || h.length < MA_SHORT) return 0;
  const shortMA = h.slice(-MA_SHORT).reduce((a, b) => a + b, 0) / MA_SHORT;
  const longMA = h.reduce((a, b) => a + b, 0) / h.length;
  return (shortMA - longMA) / longMA;
}

function getDeviation(symbol: string): number {
  const h = priceHistory[symbol];
  if (!h || h.length < MA_LONG) return 0;
  const ma = h.reduce((a, b) => a + b, 0) / h.length;
  return (h[h.length - 1] - ma) / ma;
}

// ─── Scalper position tracker ────────────────────────────────
const scalperPositions: Map<string, { side: string; qty: number; leverage: number }> = new Map();

// ─── Wait for first prices ───────────────────────────────────
async function waitForInitialPrices(timeoutMs = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const btc = getPriceOrWarn("BTCUSD");
    const eth = getPriceOrWarn("ETHUSD");
    const sol = getPriceOrWarn("SOLUSD");
    if (btc > 0 && eth > 0 && sol > 0) return true;
    await sleep(500);
  }
  return false;
}

// ─── Auto on-ramp ────────────────────────────────────────────
async function autoOnRamp(traders: Trader[]) {
  while (true) {
    await sleep(rand(8000, 12000));
    for (const trader of traders) {
      try {
        await fetch("http://localhost:3000/onRamp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${trader.token}`,
          },
          body: JSON.stringify({ amount: 50000 }),
        });
      } catch {}
    }
  }
}

// ─── Random helpers ──────────────────────────────────────────
function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickSymbol(): Symbol {
  const r = Math.random();
  if (r < 0.7) return "SOLUSD";
  if (r < 0.9) return "ETHUSD";
  return "BTCUSD";
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Trader runner ───────────────────────────────────────────
async function runTrader(trader: Trader, id: number) {
  const isMM = id < 4;
  const isScalper = id === 8;

  await sleep(rand(2000 * id, 4000 * id));

  if (isMM) {
    while (true) {
      const symbol = pickSymbol();
      const midPrice = getPriceOrWarn(symbol);
      if (midPrice <= 0) { await sleep(1000); continue; }
      recordPrice(symbol, midPrice);

      const cancelled = await cancelStaleOrders(trader, symbol, id);
      for (const c of cancelled) {
        log("🗑", colors.blue, TRADER_LABELS[id], `${c.action} ${c.side} @ ${c.price}`);
      }

      const inventory = 0;
      const results = await runStrategy(trader, symbol, midPrice, id, { inventory });
      const arr = Array.isArray(results) ? results : [results];
      for (const r of arr) {
        const color = r.filled ? colors.green : r.action === "FAILED" ? colors.red : colors.yellow;
        log(r.filled ? "✓" : "○", color, TRADER_LABELS[id],
          `${r.action} ${r.side} ${r.type} ${r.symbol} qty=${r.qty.toFixed(4)} lev=${r.leverage}x @ ${r.price}`);
      }

      await sleep(rand(2000, 4000));
    }
  }

  // Other traders
  while (true) {
    const symbol = pickSymbol();
    const midPrice = getPriceOrWarn(symbol);
    if (midPrice <= 0) { await sleep(1000); continue; }
    recordPrice(symbol, midPrice);

    const trend = getTrend(symbol);
    const deviation = getDeviation(symbol);

    if (isScalper) {
      const pos = scalperPositions.get(trader.email);
      if (pos) {
        const exit = await runExit(trader, symbol, midPrice, id, pos.side, pos.qty, pos.leverage);
        scalperPositions.delete(trader.email);
        const color = exit.filled ? colors.green : colors.red;
        log("EXIT", color, TRADER_LABELS[id],
          `${exit.action} ${exit.side} ${symbol} qty=${exit.qty.toFixed(4)}`);
        await sleep(rand(1000, 3000));
        continue;
      }

      const results = await runStrategy(trader, symbol, midPrice, id);
      const arr = Array.isArray(results) ? results : [results];
      for (const r of arr) {
        if (r.filled) {
          scalperPositions.set(trader.email, { side: r.side, qty: r.qty, leverage: r.leverage });
          log("ENTER", colors.magenta, TRADER_LABELS[id],
            `${r.action} ${r.side} ${symbol} qty=${r.qty.toFixed(4)} lev=${r.leverage}x`);
        }
      }

      await sleep(rand(2000, 6000));
    } else {
      const results = await runStrategy(trader, symbol, midPrice, id, { trend, deviation });
      const arr = Array.isArray(results) ? results : [results];
      for (const r of arr) {
        if (r.action === "PLACED" && r.type === "none") continue;
        const color = r.filled ? colors.green : r.action === "FAILED" ? colors.red : colors.yellow;
        const emoji = r.type === "market" ? "⚡" : "○";
        log(emoji, color, TRADER_LABELS[id],
          `${r.action} ${r.side} ${r.type} ${r.symbol} qty=${r.qty.toFixed(4)} lev=${r.leverage}x @ ${r.price}`);
      }

      await sleep(rand(1000, 4000));
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────
console.log(`${colors.cyan}${colors.bold}
╔═══════════════════════════════════════════════════╗
║  Perps Trading Simulator — Live Index Prices     ║
╠═══════════════════════════════════════════════════╣
║  Prices from Binance via platform WebSocket      ║
║  MM1-MM4    Market Makers  (limit, bid+ask)      ║
║  MOM1/MOM2  Momentum       (limit @ 0.05%)       ║
║  REV1/REV2  Mean Reversion (limit @ 0.3%)        ║
║  SCALP      Scalper        (limit @ 0.04%)       ║
║  RETAIL     Retail         (70% limit / 30% mkt) ║
╚═══════════════════════════════════════════════════╝
${colors.reset}`);

console.log(`${colors.dim}Seeding traders...${colors.reset}`);
const traders = await seedTraders(TRADER_NAMES);
console.log(`${colors.green}✓ ${traders.length} traders ready${colors.reset}\n`);

console.log(`${colors.dim}Fetching live prices from Binance API...${colors.reset}`);

const hasPrices = await waitForInitialPrices();
if (hasPrices) {
  const btc = getPriceOrWarn("BTCUSD");
  const eth = getPriceOrWarn("ETHUSD");
  const sol = getPriceOrWarn("SOLUSD");
  console.log(`${colors.green}✓ Live prices: BTC=$${btc.toLocaleString()} ETH=$${eth.toLocaleString()} SOL=$${sol.toLocaleString()}${colors.reset}\n`);
} else {
  console.log(`${colors.yellow}⚠ Could not fetch prices from Binance, starting traders anyway...${colors.reset}`);
}

// Start traders
const runners = traders.map((t, i) => runTrader(t, i));
runners.push(autoOnRamp(traders));
await Promise.all(runners);
