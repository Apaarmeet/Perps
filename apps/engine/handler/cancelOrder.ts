import { ORDERBOOK, ORDERS, type cancelOrderInput } from "../exchangeStore";
import { reconcileUserMargin } from "../helper/margin";

export function handleCancelOrder(payload : cancelOrderInput){
    const {userId, orderId} = payload 

    const order = ORDERS.get(orderId)
    if(!order) throw new Error("Order Does not Exist")
    if(order.userId !== userId) throw new Error("Unauthorised")
    if(order.type !== "limit") throw new Error("Only resting limit orders can be cancelled")
    if(order.status === "filled" || order.status==="cancelled") throw new Error("Order already filled or cancelled")


    const orderBook = ORDERBOOK.get(order.symbol)

    if(orderBook && order.type === "limit"){
        const level = order.side === "LONG" ? orderBook.bids:orderBook.asks
        const levelOrders = level.get(order.price!)
        if(levelOrders){
            const updatedRestOrders = levelOrders.filter((f)=>f.orderId != orderId)
            if(updatedRestOrders.length > 0) {
                level.set(order.price!, updatedRestOrders)
            } else {
                level.delete(order.price!)
            }
        }
    }

    order.status = "cancelled"
    reconcileUserMargin(userId)

    return order
}
