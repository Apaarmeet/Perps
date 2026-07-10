import { getRedisClient } from "@repo/redis";

const redis = await getRedisClient();
const publisher = await getRedisClient();

export async function startEngineDataBridge() {
    while (true) {
        const streams = await redis.xRead(
            [{ key: "engine-dataStream", id: "$" }],
            { BLOCK: 0 }
        );

        for (const stream of streams!) {
            for (const msg of stream.messages) {
                const { commandType, data } = msg.message;
                publisher.publish("engine-data", JSON.stringify({ commandType, data }));
            }
        }
    }
}
