import { BALANCES, INDEX_PRICES, ORDERBOOK, POSITIONS } from "../exchangeStore";
import { liquidatePositions } from "./liquidation";


function applyFunding(symbol: string, fundingRate: number) {
    for (const [userId, userPositions] of POSITIONS) {
        const position = userPositions.get(symbol);
        if (!position) continue;

        const notional = position.qty * position.averagePrice;
        const payment = notional * fundingRate;
        const userBalance = BALANCES.get(userId);

        if (!userBalance || !userBalance["USD"]) continue;
        // LONG pays when fundingRate > 0, receives when < 0
        // SHORT receives when fundingRate > 0, pays when < 0
        if (position.side === "LONG" && fundingRate > 0) {
            if (userBalance["USD"]!.available < payment) {
                liquidatePositions(symbol, INDEX_PRICES.get(symbol)!);
            } else {
                userBalance["USD"]!.available -= payment;
            }
        } else if (position.side === "SHORT" && fundingRate < 0) {
            if (userBalance["USD"]!.available < Math.abs(payment)) {
                liquidatePositions(symbol, INDEX_PRICES.get(symbol)!);
            } else {
                userBalance["USD"]!.available += payment;
            }
        } else {
            // receiving funding — always safe
            userBalance["USD"]!.available += payment;
        }
    }
}

export function calculateAndApplyFunding(symbol: string) {
    const indexPrice = INDEX_PRICES.get(symbol);
    if (!indexPrice) return;

    const orderBook = ORDERBOOK.get(symbol);
    if (!orderBook) return;

    let markPrice = indexPrice;
    const bestBid = orderBook.bids.size > 0 ? Math.max(...orderBook.bids.keys()) : null;
    const bestAsk = orderBook.asks.size > 0 ? Math.min(...orderBook.asks.keys()) : null;

    if (bestBid && bestAsk) {
        markPrice = (bestBid + bestAsk) / 2;
    }

    // fundingRate per 8h period
    const fundingIntervalsPerDay = 3; 
    const fundingRate = ((markPrice - indexPrice) / indexPrice) * (1 / fundingIntervalsPerDay);

    applyFunding(symbol, fundingRate);

    return fundingRate;
}
