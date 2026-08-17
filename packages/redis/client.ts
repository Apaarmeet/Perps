import { createClient } from "redis";

export async function getRedisClient() {
    const client = createClient({
        url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
        socket: {
            reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
            connectTimeout: 10000,
        },
    });

    client.on("error", (err) => {
        // Log error without crashing process during initial handshake
        console.error("Redis Client Error:", (err as Error).message || err);
    });

    if (!client.isOpen) {
        await client.connect();
    }
    return client;
}
