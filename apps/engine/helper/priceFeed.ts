import { liquidatePositions } from "./liquidation";
import { getRedisClient } from "@repo/redis";

const priceFeeder = await getRedisClient();
const writeClient = await getRedisClient();

export async function startPriceFeed() {
    while (true) {
        const streams = await priceFeeder.xRead(
            [{ key: "price-feederStream", id: "$" }],
            { BLOCK: 0 }
        );

        for (const stream of streams!) {
            for (const msg of stream.messages) {
                const { symbol, price } = msg.message;
                const liquidations = liquidatePositions(symbol as string, parseFloat(price as string));

                for (const liq of liquidations) {
                    writeClient.xAdd("engine-dataStream", "*", {
                        commandType: "liquidation",
                        data: JSON.stringify(liq),
                    });
                }
            }
        }
    }
}
