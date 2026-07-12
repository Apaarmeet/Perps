import { BALANCES, FILLS, ORDERBOOK, ORDERS, type Fill, type RestingOrder, type createOrderInput,} from "../exchangeStore";
import { reconcileUserMargin } from "../helper/margin";
import { applyFillToPosition } from "../helper/updatePosition";

function validateOrder({ type, price, qty, leverage, sllipage }: createOrderInput) {
    if (qty <= 0) throw new Error("Quantity must be positive");
    if ( leverage <= 0) throw new Error("Leverage must be positive");
    if ( sllipage < 0) throw new Error("Slippage must be non-negative");
    if (type === "limit" && ( price === null || price <= 0)) {
        throw new Error("A positive price is required for limit orders");
    }
}

export function handleCreateOrder(payload: createOrderInput) {
    const { userId, type, side, symbol, price, qty, leverage, sllipage } = payload;
    validateOrder(payload);

    const usd = BALANCES.get(userId)?.USD;
    if (!usd) throw new Error("Wallet not initialised");

    const orderBook = ORDERBOOK.get(symbol) ?? { bids: new Map(), asks: new Map() };
    ORDERBOOK.set(symbol, orderBook);

    const oppositeLevels = side === "LONG" ? orderBook.asks : orderBook.bids;
    const prices = [...oppositeLevels.keys()].sort(side === "LONG" ? (a, b) => a - b : (a, b) => b - a);
    const bestPrice = prices[0];
    if (type === "market" && bestPrice === undefined) throw new Error("No liquidity available");

    const reservePrice = type === "limit" ? price! : bestPrice! * (1 + (sllipage / 100));
    const marginToReserve = (reservePrice * qty) / leverage;
    if ( usd.available < marginToReserve) {
        throw new Error("Insufficient balance");
    }

    usd.available -= marginToReserve;
    usd.locked += marginToReserve;

    const orderId = crypto.randomUUID();
    const createdAt = Date.now();
    let remainingQty = qty;
    let filledQty = 0;
    const fills: Fill[] = [];
    const touchedUsersinRestingOrders = new Set<string>([userId]);

    for (const levelPrice of prices) {
        if (remainingQty <= 0) break;
        if (type === "limit" && (side === "LONG" ? levelPrice > price! : levelPrice < price!)) break;

        const restingOrders = oppositeLevels.get(levelPrice);
        if (!restingOrders) continue;

        for (const restingOrder of [...restingOrders]) {
            if (remainingQty <= 0) break;

            const availableAtLevel = restingOrder.qty - restingOrder.filledQty;
            if (availableAtLevel <= 0) continue;

            const fillQty = Math.min(remainingQty, availableAtLevel);
            const fill: Fill = {
                fillId: crypto.randomUUID(),
                qty: fillQty,
                price: levelPrice,
                makerOrderid: restingOrder.orderId,
                takerOrderId: orderId,
                symbol,
                createdAt,
            };

            restingOrder.filledQty += fillQty;
            filledQty += fillQty;
            remainingQty -= fillQty;
            FILLS.push(fill);
            fills.push(fill);

            const makerOrder = ORDERS.get(restingOrder.orderId);
            if (makerOrder) {
                makerOrder.filledQty += fillQty;
                makerOrder.fills.push(fill);
                makerOrder.status = makerOrder.filledQty === makerOrder.qty ? "filled" : "partially_filled";
            }

            const makerSide = side === "LONG" ? "SHORT" : "LONG";
            applyFillToPosition(restingOrder.userId, symbol, fillQty, levelPrice, makerSide, restingOrder.leverage);
            applyFillToPosition(userId, symbol, fillQty, levelPrice, side, leverage);
            touchedUsersinRestingOrders.add(restingOrder.userId);

            if (restingOrder.filledQty === restingOrder.qty) {
                const remainingAtLevel = (oppositeLevels.get(levelPrice) ?? []).filter(
                    (order: RestingOrder) => order.orderId !== restingOrder.orderId,
                );
                if (remainingAtLevel.length === 0) oppositeLevels.delete(levelPrice);
                else oppositeLevels.set(levelPrice, remainingAtLevel);
            }
        }
    }

    const status = remainingQty === 0 ? "filled" : filledQty > 0 ? "partially_filled" : "open";
    ORDERS.set(orderId, {
        orderid: orderId,
        userId,
        qty,
        filledQty,
        price: type === "limit" ? price : null,
        side,
        type,
        symbol,
        leverage,
        margin: marginToReserve,
        status,
        fills,
        createdAt,
    });

    if (type === "limit" && remainingQty > 0) {
        const restingOrder: RestingOrder = {
            orderId,
            userId,
            side,
            type: "limit",
            symbol,
            filledQty,
            qty,
            status,
            price: price!,
            leverage,
            createdAt,
        };
        const ownLevels = side === "LONG" ? orderBook.bids : orderBook.asks;
        const ordersAtPrice = ownLevels.get(price!) ?? [];
        ordersAtPrice.push(restingOrder);
        ownLevels.set(price!, ordersAtPrice);
    }

    for (const id of touchedUsersinRestingOrders) reconcileUserMargin(id);
    return { order: ORDERS.get(orderId), fills };
}
