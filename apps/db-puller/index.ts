import { getRedisClient } from "@repo/redis"
import { prisma } from "@repo/db"

const redis = await getRedisClient()
const cleanupPub = await getRedisClient()

async function handleDbWrites(msg: any) {
    const { commandType, ok, data } = msg.message
    if (ok !== "true" || !data) return

    const payload = JSON.parse(data as string)
    const order = payload.order || payload

    if (commandType !== "create-order" && commandType !== "cancel-order") return;

    await prisma.order.upsert({
        where: { orderId: order.orderid },
        update: { filledQty: order.filledQty, Status: order.status },
        create: {
            orderId: order.orderid,
            userId: order.userId,
            symbol: order.symbol,
            side: order.side === "LONG" ? "buy" : "sell",
            type: order.type,
            price: order.price,
            qty: order.qty,
            filledQty: order.filledQty,
            margin: order.margin,
            Status: order.status,
            createdAt: new Date(order.createdAt),
        }
    });

    if (commandType === "cancel-order") {
        await prisma.order.update({
            where: { orderId: order.orderid },
            data: { Status: "cancelled" },
        });
    }

    if (payload.fills) {
        const isLong = order.side === "LONG"
        for (const fill of payload.fills) {
            await prisma.fill.upsert({
                where: { fillId: fill.fillId },
                update: {},
                create: {
                    fillId: fill.fillId,
                    symbol: fill.symbol,
                    Price: fill.price,
                    qty: fill.qty,
                    buyorderId: isLong ? fill.takerOrderId : fill.makerOrderid,
                    sellOrderId: isLong ? fill.makerOrderid : fill.takerOrderId,
                    createdAt: new Date(fill.createdAt),
                },
            });
        }
    }

    // Signal engine that this order is persisted and can be freed from memory
    await cleanupPub.publish("engine:cleanup", JSON.stringify({ orderId: order.orderid }));
}

async function handleCandle(msg: any) {
    const { commandType, data } = msg.message
    if (commandType !== "candle" || !data) return

    const parsed = JSON.parse(data as string)
    const { key, candle } = parsed
    const [symbol, interval] = (key as string).split(":")

    await prisma.candle.upsert({
        where: {
            time_symbol_interval: {
                time: new Date(candle.timestamp),
                symbol: symbol!,
                interval: interval!,
            },
        },
        update: {
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
        },
        create: {
            time: new Date(candle.timestamp),
            symbol: symbol!,
            interval: interval!,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
        },
    })
}

async function dbPuller() {
    let dataStreamid = "0"
    let dataWriteid = "0"
    while (true) {
        const streams = await redis.xRead(
            [
                { key: "engine:db-writes", id: dataWriteid},
                { key: "engine-dataStream", id: dataStreamid },
            ],
            { BLOCK: 0, COUNT: 10 }
        );

        for (const stream of streams!) {
            for (const msg of stream.messages) {
                if (stream.name === "engine:db-writes") {
                    await handleDbWrites(msg)
                    dataWriteid = msg.id
                } else if (stream.name === "engine-dataStream") {
                    await handleCandle(msg)
                    dataStreamid = msg.id
                }
            }
        }
    }
}

dbPuller().catch((err) => {
    console.error("dbPuller crashed:", err);
    process.exit(1);
});
