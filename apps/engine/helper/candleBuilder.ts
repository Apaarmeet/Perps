import { CANDLES, type Candle } from "../exchangeStore";

const INTERVALS = [
    { label: "1m", ms: 60_000 },
    { label: "5m", ms: 300_000 },
    { label: "30m", ms: 1_800_000 },
];

function buildCandles(symbol: string, price: number, now: number): { key: string; candle: Candle }[] {
    const closed: { key: string; candle: Candle }[] = [];

    for (const { label, ms } of INTERVALS) {
        const key = `${symbol}:${label}`;
        const candleStart = Math.floor(now / ms) * ms;

        const candles = CANDLES.get(key) ?? [];
        CANDLES.set(key, candles);

        const last = candles[candles.length - 1];

        if (!last || last.timestamp < candleStart) {
            if (last) {
                closed.push({ key, candle: { ...last } });
            }
            candles.push({
                symbol,
                open: price,
                high: price,
                low: price,
                close: price,
                timestamp: candleStart,
            });
        } else {
            if (price > last.high) last.high = price;
            if (price < last.low) last.low = price;
            last.close = price;
        }

        if (candles.length > 100) {
            CANDLES.set(key, candles.slice(-100));
        }
    }

    return closed;
}

export function recordTradePrice(symbol: string, price: number, timestamp: number): { key: string; candle: Candle }[] {
    return buildCandles(symbol, price, timestamp);
}
