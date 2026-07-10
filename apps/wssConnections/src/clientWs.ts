import { getRedisClient } from "@repo/redis";

const clients = new Set<Bun.ServerWebSocket<undefined>>();

const subscriber = await getRedisClient();
await subscriber.subscribe("engine-data", (message) => {
    for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
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
            clients.add(ws);
            console.log(`Frontend client connected. Total: ${clients.size}`);
        },
        close(ws) {
            clients.delete(ws);
            console.log(`Frontend client disconnected. Total: ${clients.size}`);
        },
        message(ws, message) {},
    },
});

console.log("Client WebSocket server running on port 3002");
