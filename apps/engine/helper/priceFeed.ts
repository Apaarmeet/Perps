import { liquidatePositions } from "./liquidation";
import { recordTradePrice } from "./candleBuilder";
import { FILLS } from "../exchangeStore";
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
                const parsedSymbol = symbol as string;
                const parsedPrice = parseFloat(price as string);
                const now = Date.now();

                const liquidations = liquidatePositions(parsedSymbol, parsedPrice);

                for (const liq of liquidations) {
                    writeClient.xAdd("engine-dataStream", "*", {
                        commandType: "liquidation",
                        data: JSON.stringify(liq),
                    });
                }

                // build candles from last traded perps price for this symbol
                const lastFill = FILLS.findLast(f => f.symbol === parsedSymbol);
                if (lastFill) {
                    const closed = recordTradePrice(parsedSymbol, lastFill.price, now);
                    for (const { key, candle } of closed) {
                        writeClient.xAdd("engine-dataStream", "*", {
                            commandType: "candle",
                            data: JSON.stringify({ key, candle }),
                        });
                    }
                }
            }
        }
    }
}
