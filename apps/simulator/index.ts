import { seedTraders, getTraders, getRandomTrader, request } from "./setup";
import { placeRandomOrder, aggroScalp } from "./strategy";
import { SYMBOLS, type Symbol } from "./constants";
import type { Trader } from "./setup";

const WS_URL = "ws://localhost:3002";
const TRADER_NAMES = ["alice", "bob", "charlie", "diana", "eve", "frank", "grace", "hank"];

const prices: Record<Symbol, number> = {
  BTCUSD: 0,
  ETHUSD: 0,
  SOLUSD: 0,
};

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
    `${colors.dim}${t}${colors.reset} ${color}${emoji}${colors.reset} ${colors.bold}${trader}${colors.reset} ${msg}`
  );
}

function connectPriceFeed() {
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log(`${colors.green}✓ Price feed connected${colors.reset}`);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string);
      if (data.symbol && data.price) {
        const sym = data.symbol as Symbol;
        prices[sym] = parseFloat(data.price);
      }
    } catch {}
  };

  ws.onclose = () => {
    console.log(`${colors.red}✗ Price feed disconnected, reconnecting...${colors.reset}`);
    setTimeout(connectPriceFeed, 2000);
  };
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.random() * (maxMs - minMs) + minMs));
}

const SYMBOLS_WEIGHTED: Symbol[] = [
  "SOLUSD", "SOLUSD", "SOLUSD",
  "ETHUSD", "ETHUSD",
  "BTCUSD",
];

function pickSymbol(): Symbol {
  return SYMBOLS_WEIGHTED[Math.floor(Math.random() * SYMBOLS_WEIGHTED.length)];
}

async function autoOnRamp(traders: Trader[]) {
  while (true) {
    await randomDelay(8000, 12000);
    for (const trader of traders) {
      try {
        await request("/onRamp", {
          method: "POST",
          body: JSON.stringify({ amount: 50000 }),
          token: trader.token,
        });
      } catch {}
    }
  }
}

async function runTrader(trader: Trader, id: number) {
  await randomDelay(1000 * id, 3000 * id);

  while (true) {
    const symbol = pickSymbol();
    const currentPrice = prices[symbol];

    if (currentPrice <= 0) {
      await randomDelay(500, 1500);
      continue;
    }

    // 20% chance to do aggressive scalp, 80% random order
    if (Math.random() < 0.2) {
      log("⚡", colors.magenta, trader.email, `SCALPING ${symbol} @ ${currentPrice.toFixed(1)}`);
      const results = await aggroScalp(trader, symbol, currentPrice);
      for (const r of results) {
        const color = r.filled ? colors.green : r.action === "FAILED" ? colors.red : colors.yellow;
        const err = r.error ? ` ${colors.dim}(${r.error})${colors.reset}` : "";
        log(
          r.filled ? "✓" : "○",
          color,
          trader.email,
          `${r.action} ${r.side} ${r.type} ${r.symbol} qty=${r.qty} lev=${r.leverage}x @ ${r.price}${err}`
        );
      }
    } else {
      const result = await placeRandomOrder(trader, symbol, currentPrice);
      const color = result.filled ? colors.green : result.action === "FAILED" ? colors.red : colors.yellow;
      const err = result.error ? ` ${colors.dim}(${result.error})${colors.reset}` : "";
      log(
        result.filled ? "✓" : "○",
        color,
        trader.email,
        `${result.action} ${result.side} ${result.type} ${result.symbol} qty=${result.qty} lev=${result.leverage}x @ ${result.price}${err}`
      );
    }

    // random cooldown between 100ms and 800ms
    await randomDelay(100, 800);
  }
}

console.log(`${colors.cyan}${colors.bold}
╔══════════════════════════════════════╗
║   Perps Trading Simulator           ║
║   8 traders, 3 markets, live prices ║
╚══════════════════════════════════════╝
${colors.reset}`);

console.log(`${colors.dim}Seeding traders...${colors.reset}`);
const traders = await seedTraders(TRADER_NAMES);
console.log(`${colors.green}✓ ${traders.length} traders ready${colors.reset}\n`);

console.log(`${colors.dim}Connecting to price feed...${colors.reset}`);
connectPriceFeed();

// wait for some prices to arrive
await randomDelay(2000, 3000);
console.log(`${colors.dim}Prices: BTC=${prices.BTCUSD.toFixed(1)} ETH=${prices.ETHUSD.toFixed(1)} SOL=${prices.SOLUSD.toFixed(1)}${colors.reset}\n`);

// start all traders + auto on-ramp in parallel
const runners = traders.map((t, i) => runTrader(t, i));
runners.push(autoOnRamp(traders));
await Promise.all(runners);
