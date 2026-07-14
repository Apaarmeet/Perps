import {getRedisClient} from "@repo/redis"
import { handleEngineRequest } from "./requestHandler";
import { ORDERBOOK, FILLS, INDEX_PRICES } from "../exchangeStore";
import { recordTradePrice } from "./candleBuilder";


const readClient = await getRedisClient()
const writeclient = await getRedisClient()
let lastId = "$"

async function publishDepthSnapshot(symbol: string) {
    const orderBook = ORDERBOOK.get(symbol);
    if (!orderBook) return;

    const asks = [...orderBook.asks.entries()]
        .map(([price, orders]) => [
            price,
            orders.reduce((sum, order) => sum + (order.qty - order.filledQty), 0),
        ] as [number, number])
        .sort((a, b) => a[0] - b[0])
        .slice(0, 20);

    const bids = [...orderBook.bids.entries()]
        .map(([price, orders]) => [
            price,
            orders.reduce((sum, order) => sum + (order.qty - order.filledQty), 0),
        ] as [number, number])
        .sort((a, b) => b[0] - a[0])
        .slice(0, 20);

    await writeclient.xAdd("engine-dataStream", "*", {
        commandType: "depth",
        data: JSON.stringify({ symbol, asks, bids }),
    });
}

export async function consumeEngineRequests(){
    while (true){
        const streams = await readClient.xRead(
            [{key:"engine:commands", id: lastId}],
            {BLOCK: 0}
        );

        for(const stream of streams ?? []){
            for(const msg of stream.messages){
                const {type, correlationId, responseQueue, payload} = msg.message;
                lastId = msg.id

                try{
                    const result  =  handleEngineRequest({
                        correlationId: correlationId ,
                        type: type,
                        payload: JSON.parse(payload)
                    })


                    await writeclient.xAdd(responseQueue as string, "*", {
                        correlationId: correlationId as string,
                        ok: "true",
                        data: JSON.stringify(result)
                    });
                     await writeclient.xAdd("engine:db-writes", "*", {
                            correlationId,
                            commandType: type,
                            ok:"true",
                            data: JSON.stringify(result),
                    });
                    await writeclient.xAdd("engine-dataStream", "*", {
                            commandType: type,
                            data: JSON.stringify(result),
                    });

                    if (type === "create-order" || type === "cancel-order") {
                        const parsedPayload = JSON.parse(payload);
                        const symbol = (result as any)?.order?.symbol ?? parsedPayload.symbol ?? null;
                        if (symbol) await publishDepthSnapshot(symbol);
                    }

                    if (type === "create-order") {
                        const fills = (result as any)?.fills as any[];
                        const symbol = (result as any)?.order?.symbol as string;
                        if (fills?.length && symbol) {
                            const now = Date.now();
                            const lastFill = FILLS.findLast(f => f.symbol === symbol);
                            if (lastFill) {
                                const perpPrice = lastFill.price;
                                const indexPrice = INDEX_PRICES.get(symbol) ?? 0;

                                const { closed, current } = recordTradePrice(symbol, perpPrice, now);
                                for (const { key, candle } of closed) {
                                    writeclient.xAdd("engine-dataStream", "*", {
                                        commandType: "candle",
                                        data: JSON.stringify({ key, candle }),
                                    });
                                }
                                for (const { key, candle } of current) {
                                    writeclient.xAdd("engine-dataStream", "*", {
                                        commandType: "candle-update",
                                        data: JSON.stringify({ key, candle }),
                                    });
                                }

                                writeclient.xAdd("engine-dataStream", "*", {
                                    commandType: "price-update",
                                    data: JSON.stringify({
                                        symbol,
                                        perpPrice,
                                        indexPrice,
                                    }),
                                });
                            }
                        }
                    }
                } catch (err) {
                    await writeclient.xAdd(responseQueue as string , "*", {
                        correlationId: correlationId as string,
                        ok: "false",
                        error: String((err as Error).message)
                    })
                }
            }
        }
        
    }
}
