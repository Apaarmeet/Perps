import { getRedisClient } from "@repo/redis";

const clients = new Map<Bun.ServerWebSocket<unknown>, Set<string>>();

const subscriber = await getRedisClient();
await subscriber.subscribe("engine-data", (message) => {
    try {
        const parsed = JSON.parse(message);
        let symbol = parsed.symbol;
        
        if (!symbol && parsed.data) {
            try {
                const dataObj = typeof parsed.data === "string" ? JSON.parse(parsed.data) : parsed.data;
                symbol = dataObj.symbol || dataObj.candle?.symbol || dataObj.order?.symbol || dataObj.fill?.symbol;
                if (!symbol && dataObj.key) symbol = dataObj.key.split(":")[0];
            } catch {}
        }

        const isGlobal = !symbol;

        for (const [ws, subs] of clients) {
            if (ws.readyState === WebSocket.OPEN) {
                if (isGlobal || subs.size === 0 || subs.has(symbol)) {
                    ws.send(message);
                }
            }
        }
    } catch (err) {
        for (const [ws] of clients) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(message);
            }
        }
    }
});

Bun.serve({
    port: 3002,
    fetch(req, server) {
        if (server.upgrade(req)) {
            return;
        }
        return new Response("Upgrade failed", { status: 426 });
    },
    websocket: {
        open(ws) {
            clients.set(ws, new Set());
            console.log(`Frontend client connected. Total: ${clients.size}`);
        },
        close(ws) {
            clients.delete(ws);
            console.log(`Frontend client disconnected. Total: ${clients.size}`);
        },
        message(ws, message) {
            try {
                const parsed = JSON.parse(message as string);
                if (parsed.action === "subscribe" && parsed.market) {
                    const subs = clients.get(ws);
                    if (subs) {
                        subs.clear();
                        subs.add(parsed.market);
                    }
                }
            } catch {}
        },
    },
});

console.log("Client WebSocket server running on port 3002");
