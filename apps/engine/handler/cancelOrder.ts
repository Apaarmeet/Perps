import { BALANCES, ORDERBOOK, ORDERS, type cancelOrderInput } from "../exchangeStore";

export function handleCancelOrder(payload : cancelOrderInput){
    const {userId, orerId} = payload 

    const order = ORDERS.get(orerId)
    if(!order) throw new Error("Order Does not Exist")
    if(order.userId !== userId) throw new Error("Unauthorised")
    if(order.status === "FILLED" || order.status==="CANCELLED") throw new Error("Order already filled or cancelled")


    const orderBook = ORDERBOOK.get(order.symbol)

    if(orderBook && order.type === "limit"){
        const level = order.side === "LONG" ? orderBook.bids:orderBook.asks
        const levelOrders = level.get(order.price!)
        if(levelOrders){
            const updatedRestOrders = levelOrders.filter((f)=>f.orderId != orerId)
            if(updatedRestOrders.length > 0) {
                level.set(order.price!, updatedRestOrders)
            } else {
                level.delete(order.price!)
            }
        }
    }

    const userBalance = BALANCES.get(userId)
    const USDBalance = userBalance!["USD"]

    const remainingQty = order.qty-order.filledQty
    const marginToRelease = (order.price!  *  remainingQty)/order.leverage
    USDBalance!.locked -= marginToRelease
    USDBalance!.available += marginToRelease

    order.status = "CANCELLED"

    return order
}