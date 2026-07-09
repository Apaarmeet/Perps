import { liquidatePositions } from "./liquidation";

export function startPriceFeed(symbol: string) {
    // normalize symbol for binance (e.g. "BTCUSD" -> "btcusdt")
    const binanceSymbol = `${symbol.toLowerCase().replace("usd", "usdt")}`;
    const WS_URL = `wss://stream.binance.com:9443/ws/${binanceSymbol}@trade`;

    function connect() {
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log(`Price feed connected for ${symbol} (${binanceSymbol})`);
        };

        ws.onmessage = (event) => {
            try {
                const trade = JSON.parse(event.data as string);
                const price = parseFloat(trade.p);
                liquidatePositions(symbol.toUpperCase(), price);
            } catch (err) {
                console.error("Price feed parse error:", err);
            }
        };

        ws.onerror = (err) => {
            console.error(`Price feed error for ${symbol}:`, err);
        };

        ws.onclose = () => {
            console.log(`Price feed disconnected for ${symbol}, reconnecting in 3s...`);
            setTimeout(connect, 3000);
        };
    }

    connect();
}
