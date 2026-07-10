# data-flow
- Engine publishes data to Redis streams (engine-dataStream) → bridge → PubSub → clientWs (WebSocket port 3002) → frontend. Live data uses WebSocket, historical data uses DB. Confidence: 0.70

# code-style
- Data shapes sent over streams should match the Prisma schema model fields directly; avoid adding extra metadata or wrapper abstractions. Confidence: 0.65
