
    import { consumeEngineRequests } from "./helper/redisConsumer";
    import { startPriceFeed } from "./helper/priceFeed";
import { INDEX_PRICES } from "./exchangeStore";
import { calculateAndApplyFunding } from "./helper/fundingRate";

    const FUNDING_INTERVAL_MS = 8 * 60 * 60 * 1000;


      startPriceFeed();

    setInterval(() => {
      for (const symbol of INDEX_PRICES.keys()) {
        calculateAndApplyFunding(symbol);
      }
    }, FUNDING_INTERVAL_MS);

    consumeEngineRequests().catch((err) => {
      console.error("Redis consumer crashed:", err);
      process.exit(1);
    });