import { startPriceFeed } from "./src/pricefeed";
import { startEngineDataBridge } from "./src/engineDataBridge";
import "./src/clientWs";

const SUPPORTED_SYMBOLS = ["BTCUSD", "ETHUSD", "SOLUSD"];

for (const symbol of SUPPORTED_SYMBOLS) {
    startPriceFeed(symbol);
}

startEngineDataBridge().catch((err) => {
    console.error("Engine data bridge crashed:", err);
    process.exit(1);
});