import { BALANCES, POSITIONS, type Position } from "../exchangeStore"

export function applyFillToPosition(userId: string, symbol: string, fillQty: number, fillPrice: number, side: "LONG" | "SHORT", leverage: number) {
    let userPositions = POSITIONS.get(userId)
    if (!userPositions) {
        userPositions = new Map<string, Position>()
        POSITIONS.set(userId, userPositions)
    }

    const existing = userPositions.get(symbol)

    // Case 1: no existing position — open fresh
    if (!existing) {
        userPositions.set(symbol, {
            userId,
            side,
            qty: fillQty,
            averagePrice: fillPrice,
            liquidationPrice: side === "LONG" ? fillPrice * (1 - 1/leverage) : fillPrice * (1 + 1/leverage) ,
            leverage,
            margin: (fillPrice * fillQty) / leverage,
            pnl: 0,
        })
        return
    }

    // Case 2: same side — increase size, weighted-average entry price
    if (existing.side === side) {
        const newQty = existing.qty + fillQty
        existing.averagePrice = ((existing.averagePrice * existing.qty) + (fillPrice * fillQty)) / newQty
        existing.liquidationPrice = side === "LONG"?existing.averagePrice * (1-1/leverage) : existing.averagePrice * (1+1/leverage)
        existing.margin += (fillPrice * fillQty) / leverage
        existing.qty = newQty
        return
    }

    // Case 3: opposite side — reduce, close, or close+flip
    if (fillQty < existing.qty) {
        // partial reduce

         const marginToRelease = (fillQty / existing.qty) * existing.margin
        const realizedPnl = existing.side === "LONG"
            ? (fillPrice - existing.averagePrice) * fillQty
            : (existing.averagePrice - fillPrice) * fillQty
        existing.pnl += realizedPnl
        existing.margin -= marginToRelease
        existing.qty -= fillQty

        BALANCES.get(userId)![symbol]!.locked -= marginToRelease
        BALANCES.get(userId)![symbol]!.available += marginToRelease + realizedPnl
        return
    }

    if (fillQty === existing.qty) {
        // full close
        const marginToRelease = existing.margin
        const realizedPnl = existing.side === "LONG"
            ? (fillPrice - existing.averagePrice) * fillQty
            : (existing.averagePrice - fillPrice) * fillQty
        existing.pnl += realizedPnl
        userPositions.delete(symbol)
        BALANCES.get(userId)![symbol]!.locked -= marginToRelease
        BALANCES.get(userId)![symbol]!.available += marginToRelease + realizedPnl
        return
    }

    // fillQty > existing.qty: close existing fully, open new position with remainder
    const closedQty = existing.qty
    const marginToRelease = (closedQty * existing.averagePrice) / existing.leverage
    const realizedPnl = existing.side === "LONG"
        ? (fillPrice - existing.averagePrice) * closedQty
        : (existing.averagePrice - fillPrice) * closedQty

    const remainderQty = fillQty - closedQty
    userPositions.set(symbol, {
        userId,
        side, // the new side, i.e. the taker's side
        qty: remainderQty,
        averagePrice: fillPrice,
        liquidationPrice: side === "LONG" ? fillPrice * (1 - 1/leverage) : fillPrice * (1 + 1/leverage),
        leverage,
        margin: (remainderQty * fillPrice) / leverage,
        pnl: realizedPnl, // or track realized separately from this position's own unrealized pnl — your call
    })
    BALANCES.get(userId)![symbol]!.locked -= marginToRelease
    BALANCES.get(userId)![symbol]!.available += marginToRelease + realizedPnl
}