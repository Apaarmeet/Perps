import { BALANCES, FILLS, INDEX_PRICES, POSITIONS, type Fill } from "../exchangeStore";

export function liquidatePositions(symbol: string, price: number) {
    INDEX_PRICES.set(symbol, price);

    for (const [userId, userPositions] of POSITIONS) {
        const position = userPositions.get(symbol);
        if (!position) continue;

        const shouldLiquidate = position.side === "LONG"
            ? price <= position.liquidationPrice
            : price >= position.liquidationPrice;

        if (!shouldLiquidate) continue;

        const fillId = crypto.randomUUID();
        const createdAt = Date.now();

        const fill: Fill = {
            fillId,
            qty: position.qty,
            price,
            makerOrderid: "",
            takerOrderId: "",
            symbol,
            createdAt,
        };
        FILLS.push(fill);

        const userBalance = BALANCES.get(userId);
        if (userBalance && userBalance[symbol]) {
            userBalance[symbol].locked -= position.margin;
            userBalance[symbol].available += position.margin;

            const unrealizedPnl = position.side === "LONG"
                ? (price - position.averagePrice) * position.qty
                : (position.averagePrice - price) * position.qty;

            userBalance[symbol].available += unrealizedPnl;
        }

        position.pnl += position.side === "LONG"
            ? (price - position.averagePrice) * position.qty
            : (position.averagePrice - price) * position.qty;

        userPositions.delete(symbol);
    }
}
