# data-flow
- Engine publishes data to Redis streams (engine-dataStream) → bridge → PubSub → clientWs (WebSocket port 3002) → frontend. Live data uses WebSocket, historical data uses DB. Confidence: 0.70
- Candles should use perpetual future price, not index price. Perp price should be the prominent display with index price shown smaller/secondary. Confidence: 0.70
- Orderbook should be delivered via WebSocket (not REST polling). Confidence: 0.65
- Frontend PnL and liquidation calculations should use the engine's mark price (not perp fill price). The engine computes mark price incorporating both mark and index price components. Confidence: 0.70

# code-style
- Data shapes sent over streams should match the Prisma schema model fields directly; avoid adding extra metadata or wrapper abstractions. Confidence: 0.65

# frontend
- Frontend design should be inspired by Backpack Exchange, not Apple aesthetic. Confidence: 0.65
- UI components like balances and open orders should refresh in real-time via WebSocket subscriptions, not just on initial mount. Confidence: 0.60
- Open orders and order history tables should only show the current user's orders, not all users' orders. Filter by authenticated user ID. Confidence: 0.70
