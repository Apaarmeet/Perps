// Fetches live index prices from Binance REST API
// Also listens to platform WebSocket for real-time updates (if available)

const BINANCE_SYMBOLS: Record<string, string> = {
  BTCUSD: "BTCUSDT",
  ETHUSD: "ETHUSDT",
  SOLUSD: "SOLUSDT",
};

const PRICES: Record<string, number> = {};
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let restTimer: ReturnType<typeof setInterval> | null = null;

// ─── WebSocket (platform, optional) ──────────────────────────
function connectWs() {
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return;

  ws = new WebSocket("ws://localhost:3002");

  ws.onopen = () => {
    console.log("  ✓ Connected to platform WebSocket (ws://localhost:3002)");
  };

  ws.onmessage = (event: MessageEvent) => {
    try {
      const raw = JSON.parse(event.data as string);

      if (raw.commandType === "price-update") {
        const data = typeof raw.data === "string" ? JSON.parse(raw.data) : raw.data;
        if (data?.symbol && data?.indexPrice != null) {
          PRICES[data.symbol] = data.indexPrice;
        }
      } else if (raw.symbol && raw.price != null) {
        PRICES[raw.symbol] = parseFloat(raw.price);
      }
    } catch {
      // ignore
    }
  };

  ws.onclose = () => {
    scheduleReconnect();
  };

  ws.onerror = () => {
    ws?.close();
  };
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connectWs, 5000);
}

// ─── Binance REST API (primary source) ───────────────────────
async function fetchBinancePrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { price: string };
    return parseFloat(data.price);
  } catch {
    return null;
  }
}

async function pollPrices() {
  for (const [ourSymbol, binanceSymbol] of Object.entries(BINANCE_SYMBOLS)) {
    const price = await fetchBinancePrice(binanceSymbol);
    if (price != null && price > 0) {
      PRICES[ourSymbol] = price;
    }
  }
}

function startPolling() {
  // Immediate first fetch
  pollPrices();
  // Then every 2 seconds
  restTimer = setInterval(pollPrices, 2000);
}

// ─── Public API ──────────────────────────────────────────────
export function getPrice(symbol: string): number | undefined {
  return PRICES[symbol];
}

export function getPriceOrWarn(symbol: string): number {
  const p = PRICES[symbol];
  if (p == null) {
    console.warn(`  ⚠ No price yet for ${symbol}, retrying...`);
    return 0;
  }
  return p;
}

export function onPrice(cb: (symbol: string, price: number) => void) {
  // Not supported with REST polling
  return () => {};
}

// Start both
connectWs();
startPolling();
