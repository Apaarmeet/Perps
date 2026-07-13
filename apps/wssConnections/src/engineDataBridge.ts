import { getRedisClient } from "@repo/redis";

const redis = await getRedisClient();
const publisher = await getRedisClient();

export async function startEngineDataBridge() {
    let lastId = "$";

    while (true) {
        const streams = await redis.xRead(
            [{ key: "engine-dataStream", id: lastId }],
            { BLOCK: 0 }
        );

        for (const stream of streams!) {
            for (const msg of stream.messages) {
                lastId = msg.id;
                const { commandType, data } = msg.message;
                publisher.publish("engine-data", JSON.stringify({ commandType, data }));
            }
        }
    }
}
