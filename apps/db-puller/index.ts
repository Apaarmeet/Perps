import { getRedisClient } from "@repo/redis"
import { prisma } from "@repo/db"
const redis = await getRedisClient()

async function dbPuller() {

    while (true) {
        const streams = await redis.xRead(
            [{ key: "engine:db-writes", id: "$" }],
            { BLOCK: 0 }
        );

        for (const stream of streams!) {
            for (const msg of stream.messages) {
                const { commandType, ok, data } = msg.message
                if (ok !== "true" || !data) continue;

                const payload = JSON.parse(data as string)
                const order = payload.order || payload

                switch (commandType) {
                    case "create-order": {
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
                        break;
                    }

                    case "cancel-order": {
                        await prisma.order.update({
                            where: { orderId: order.orderid },
                            data: { Status: "cancelled" },
                        });
                        break;
                    }
                }

                if (payload.fills) {
                    const isLong = order.side === "LONG";
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
            }
        }
    }
}

dbPuller().catch((err) => {
    console.error("dbPuller crashed:", err);
    process.exit(1);
});