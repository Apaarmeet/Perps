import { getRedisClient } from "@repo/redis";

const writeClient = await getRedisClient();
const readClient = await getRedisClient();

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

const loopbackResponses = new Map<string, PendingRequest>();
const backendId = crypto.randomUUID();

export async function loopback(type: string, payload: Record<string, unknown>) {
  const correlationId = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      loopbackResponses.delete(correlationId);
      reject(new Error("Engine response timed out"));
    }, 10_000);

    loopbackResponses.set(correlationId, { resolve, reject, timeout });
    try{
        writeClient.xAdd("engine:commands", "*", {
        type,
        correlationId,
        responseQueue: `response:${backendId}`,
        payload: JSON.stringify(payload),
    })
    } catch (err){
      clearTimeout(timeout);
      loopbackResponses.delete(correlationId);
      console.error("Failed to send command to engine:", err);
      reject(new Error("Failed to send to engine"));
    }
  });
}

async function waitForResponse() {
  while (true) {
    const streams = await readClient.xRead(
      [
        { key: `response:${backendId}`, id: "$" },
      ],
      { BLOCK: 0, COUNT: 1 },
    );

    if (!streams) continue;

    for (const stream of streams) {
      for (const msg of stream.messages) {
        const raw = msg.message;
        const correlationId = raw.correlationId as string;
        const pending = loopbackResponses.get(correlationId);
        if (!pending) continue;

        clearTimeout(pending.timeout);
        loopbackResponses.delete(correlationId);

        if (raw.ok === "true") {
          pending.resolve(raw.data ? JSON.parse(raw.data as string) : undefined);
        } else {
          pending.reject(new Error((raw.error as string) ?? "EngineError"));
        }
      }
    }
  }
}

waitForResponse().catch((err) => {
  console.error("Loopback response listener crashed:", err);
  process.exit(1);
});
