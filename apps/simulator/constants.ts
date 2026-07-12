export const API_BASE = "http://localhost:3000";
export const SYMBOLS = ["BTCUSD", "ETHUSD", "SOLUSD"] as const;
export type Symbol = (typeof SYMBOLS)[number];
