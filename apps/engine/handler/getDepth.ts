import { ORDERBOOK, type getDepthInput } from "../exchangeStore";

export function handleGetDepth(payload: getDepthInput){
    const {symbol} = payload

    const orderBook = ORDERBOOK.get(symbol)
    if (!orderBook) throw new Error(`market ${symbol} doesn't exist`);

    const asks = [...orderBook.asks.entries()]
        . map(([price, orders])=> [
            price,
            orders. reduce((sum, order)=> sum + (order.qty - order.filledQty),0)
        ] as [number, number])
        .sort((a,b)=> a[0] - b[0])
        .slice(0,20)
    
    const bids = [...orderBook.bids.entries()]
        .map(([price, orders]) => [
            price,
            orders.reduce((sum, order) => sum + (order.qty - order.filledQty), 0),
        ] as [number, number])
        .sort((a, b) => b[0] - a[0])
        .slice(0, 20)

    return {
        symbol,
        asks,
        bids,
    }

}