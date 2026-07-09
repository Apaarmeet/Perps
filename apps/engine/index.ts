
    import { consumeEngineRequests } from "./helper/redisConsumer";
    import { startPriceFeed } from "./helper/priceFeed";

    const SUPPORTED_SYMBOLS = ["BTCUSD", "ETHUSD", "SOLUSD"];

    for (const symbol of SUPPORTED_SYMBOLS) {
      startPriceFeed(symbol);
    }

    consumeEngineRequests().catch((err) => {
      console.error("Redis consumer crashed:", err);
      process.exit(1);
    });