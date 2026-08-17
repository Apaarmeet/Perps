export const API_BASE = (process.env.API_URL || "http://localhost:3000").replace(/\/+$/, "");
export const WS_URL = process.env.WS_URL || "ws://localhost:3002";
export const SYMBOLS = ["BTCUSD", "ETHUSD", "SOLUSD"] as const;
export type Symbol = (typeof SYMBOLS)[number];
