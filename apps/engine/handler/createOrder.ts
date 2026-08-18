import { BALANCES, FILLS, ORDERBOOK, ORDERS, POSITIONS, USER_OPEN_ORDERS, USER_ORDERS, USER_FILLS, type Fill, type RestingOrder, type createOrderInput,} from "../exchangeStore";
import { reconcileUserMargin } from "../helper/margin";
import { applyFillToPosition } from "../helper/updatePosition";

function validateOrder({ type, price, qty, leverage, slippage }: createOrderInput) {
    if (qty <= 0) throw new Error("Quantity must be positive");
    if ( leverage <= 0) throw new Error("Leverage must be positive");
    if ( slippage < 0) throw new Error("Slippage must be non-negative");
    if (type === "limit" && ( price === null || price <= 0)) {
        throw new Error("A positive price is required for limit orders");
    }
}

export function handleCreateOrder(payload: createOrderInput) {
    const { userId, type, side, symbol, price, qty, leverage, slippage } = payload;
    validateOrder(payload);

    let userBalance = BALANCES.get(userId);
    if (!userBalance) {
        userBalance = { USD: { available: 0, locked: 0 } };
        BALANCES.set(userId, userBalance);
    }
    if (!userBalance.USD) {
        userBalance.USD = { available: 0, locked: 0 };
    }
    const usd = userBalance.USD;

    const orderBook = ORDERBOOK.get(symbol) ?? { bids: new Map(), asks: new Map() };
    ORDERBOOK.set(symbol, orderBook);

    const oppositeLevels = side === "LONG" ? orderBook.asks : orderBook.bids;
    const prices = [...oppositeLevels.keys()].sort(side === "LONG" ? (a, b) => a - b : (a, b) => b - a);
    const bestPrice = prices[0];

    if (type === "market" && bestPrice === undefined) throw new Error("No liquidity available");

    const reservePrice = type === "limit" ? price! : bestPrice! * (1 + (slippage / 100));
    const marginToReserve = (reservePrice * qty) / leverage;

    const userPositions = POSITIONS.get(userId);
    const existingPosition = userPositions?.get(symbol);
    const isClosing = existingPosition && existingPosition.side !== side && existingPosition.qty > 0;

    let effectiveMarginNeeded = marginToReserve;
    if (isClosing) {
      const closingQty = Math.min(qty, existingPosition.qty);
      const existingMarginForClosing = (closingQty / existingPosition.qty) * existingPosition.margin;
      effectiveMarginNeeded = Math.max(0, marginToReserve - existingMarginForClosing);
    }

    if (usd.available < effectiveMarginNeeded) {
      throw new Error("Insufficient balance");
    }

    usd.available -= effectiveMarginNeeded;
    usd.locked += effectiveMarginNeeded;

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

            FILLS.push(fill);
            fills.push(fill);
            
            if (!USER_FILLS.has(userId)) USER_FILLS.set(userId, []);
            USER_FILLS.get(userId)!.unshift(fill);

            if (!USER_FILLS.has(restingOrder.userId)) USER_FILLS.set(restingOrder.userId, []);
            USER_FILLS.get(restingOrder.userId)!.unshift(fill);

            restingOrder.filledQty += fillQty;
            filledQty += fillQty;
            remainingQty -= fillQty;

            const makerOrderRecord = ORDERS.get(restingOrder.orderId);
            if (makerOrderRecord) {
                makerOrderRecord.filledQty += fillQty;
                makerOrderRecord.fills.push(fill);
                makerOrderRecord.status = makerOrderRecord.filledQty === makerOrderRecord.qty ? "filled" : "partially_filled";
                ORDERS.set(restingOrder.orderId, makerOrderRecord);
                if (makerOrderRecord.status === "filled") {
                    USER_OPEN_ORDERS.get(makerOrderRecord.userId)?.delete(makerOrderRecord.orderid);
                }
            }

            const makerSide = restingOrder.side;
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

    // Market orders with zero fills: release margin, throw error
    if (type === "market" && filledQty === 0) {
        usd.available += effectiveMarginNeeded;
        usd.locked -= effectiveMarginNeeded;
        reconcileUserMargin(userId);
        throw new Error("Market order could not be filled — no matching orders on the opposite side");
    }

    // Market orders with partial fills: keep what filled, release unused margin
    if (type === "market" && remainingQty > 0) {
        const unusedMargin = (reservePrice * remainingQty) / leverage;
        usd.available += unusedMargin;
        usd.locked -= unusedMargin;
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

    let allUserOrders = USER_ORDERS.get(userId);
    if (!allUserOrders) {
        allUserOrders = new Set();
        USER_ORDERS.set(userId, allUserOrders);
    }
    allUserOrders.add(orderId);

    if (type === "limit" && remainingQty > 0) {
        let userOrders = USER_OPEN_ORDERS.get(userId);
        if (!userOrders) {
            userOrders = new Set();
            USER_OPEN_ORDERS.set(userId, userOrders);
        }
        userOrders.add(orderId);

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
    return { order: ORDERS.get(orderId), fills, touchedUsers: Array.from(touchedUsersinRestingOrders) };
}
