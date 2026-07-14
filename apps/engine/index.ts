
import { consumeEngineRequests } from "./helper/redisConsumer";
import { startPriceFeed } from "./helper/priceFeed";
import { INDEX_PRICES, FILLS, ORDERS } from "./exchangeStore";
import { calculateAndApplyFunding } from "./helper/fundingRate";
import { startSnapshotLoop } from "./helper/snapshot";
import { getRedisClient } from "@repo/redis";

const FUNDING_INTERVAL_MS = 8 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const OLD_ORDER_AGE_MS = 30 * 60 * 1000;
const MAX_FILLS = 1000;

// Listen for db-puller confirmation → immediately free in-memory order
async function startCleanupListener() {
    const sub = await getRedisClient();
    await sub.subscribe("engine:cleanup", (message) => {
        try {
            const { orderId } = JSON.parse(message);
            if (orderId && ORDERS.has(orderId)) {
                ORDERS.delete(orderId);
            }
        } catch {}
    });
}

// Periodic cleanup for anything missed by the real-time listener
function cleanup() {
    const now = Date.now();

    if (FILLS.length > MAX_FILLS) {
        FILLS.splice(0, FILLS.length - MAX_FILLS);
    }

    for (const [id, order] of ORDERS) {
        if (
            (order.status === "filled" || order.status === "cancelled") &&
            now - order.createdAt > OLD_ORDER_AGE_MS
        ) {
            ORDERS.delete(id);
        }
    }
}

startSnapshotLoop(); 
startPriceFeed();
startCleanupListener();

setInterval(() => {
    for (const symbol of INDEX_PRICES.keys()) {
        calculateAndApplyFunding(symbol);
    }
}, FUNDING_INTERVAL_MS);

setInterval(cleanup, CLEANUP_INTERVAL_MS);

consumeEngineRequests().catch((err) => {
    console.error("Redis consumer crashed:", err);
    process.exit(1);
});