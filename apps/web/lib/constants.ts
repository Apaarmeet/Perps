export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3002";

export const SUPPORTED_MARKETS = ["BTCUSD", "ETHUSD", "SOLUSD"] as const;

export const INTERVALS = ["1m", "5m", "30m"] as const;

export const DEFAULT_LEVERAGE = 5;
export const MIN_LEVERAGE = 1;
export const MAX_LEVERAGE = 20;
export const LEVERAGE_STEPS = [1, 2, 3, 5, 10, 15, 20];

export const QTY_PERCENTAGES = [25, 50, 75, 100];

export const CANDLE_HISTORY_LIMIT = 500;
