# trading
- Calculate PnL using index price, not the orderbook mid-price (perpPrice). Confidence: 0.70
- Close a position by placing an opposite-side market order matching the position, not through a dedicated close API. Confidence: 0.65
- Order quantity (qty) represents raw asset units for the order book, not USD notional. Confidence: 0.65
- Server handlers for orders and fills should query the engine via loopback (in-memory store), not Postgres via Prisma, to avoid race conditions from async db-puller persistence. Confidence: 0.70
