import { BALANCES, FILLS, ORDERBOOK, ORDERS, POSITIONS, type Balance, type createOrderInput, type Fill, type OrderBook, type RestingOrder } from "../exchangeStore";
import { applyFillToPosition } from "../helper/updatePosition";

export function handleCreateOrder(payload: createOrderInput){
    const {userId, type, side, symbol, price, qty, leverage, sllipage} = payload
    
    const userBalance = BALANCES.get(userId)
    if(!userBalance) return new Error("Wallet not initalised")
    
    let USDBalance = userBalance["USD"]
    

    let orderBook = ORDERBOOK.get(symbol)

    if(!orderBook){
         orderBook ={
            bids: new Map<number, RestingOrder[]>(),
            asks: new Map<number, RestingOrder[]>(),
        } 
        ORDERBOOK.set(symbol, orderBook)
    }

    const orderId = crypto.randomUUID()
    const createdAt = Date.now()
   
    if(side === "LONG"){
        
        const AskPrices = orderBook.asks.keys()
        const bestAsk = Math.min(...AskPrices)
        let marginToBeLocked : number  = 0

        if(type ==="market"){
            marginToBeLocked = (((bestAsk * qty) + ((sllipage/100) * (bestAsk * qty)) ) / leverage )
        }

        if(type === "limit"){
            marginToBeLocked = (price! * qty) / leverage
        }

        if(USDBalance?.available! < marginToBeLocked!) return new Error("Insufficient Balance")

        USDBalance!.available -= marginToBeLocked!
        USDBalance!.locked += marginToBeLocked!

        const sortedAskprice = [...orderBook.asks.keys()].sort((a,b)=>a-b)

        let remainingQty = qty;
        let filledQty = 0
        let totalValueOfOrder = 0 
        let fills : Fill[] = []
        for(const bestPrice of sortedAskprice){
                if(remainingQty <= 0){
                    break;
                }

                if(type === "limit" && bestPrice > price! ) break;

                const orders = orderBook.asks.get(bestPrice)
                
                if(!orders) return new Error("No liquidity available")

                for(const restingOrder of orders){
                    if(remainingQty <= 0) break;

                    const remainingQtyInRestingOrder = restingOrder.qty - restingOrder.filledQty
                    const qtyToBeFilled = Math.min(remainingQty, remainingQtyInRestingOrder)
                    filledQty += qtyToBeFilled
                    restingOrder.filledQty += qtyToBeFilled
                    remainingQty -= qtyToBeFilled
                    totalValueOfOrder +=  qtyToBeFilled * restingOrder.price
                    const fill = {
                        fillId: crypto.randomUUID(),
                        qty: qtyToBeFilled,
                        price: bestPrice,
                        makerOrderid: restingOrder.orderId,
                        takerOrderId: orderId,
                        symbol: symbol,
                        createdAt
                    }

                    FILLS.push(fill)
                    fills.push(fill)
                    applyFillToPosition(restingOrder.userId, symbol, qtyToBeFilled, bestPrice, "SHORT", restingOrder.leverage)
                    applyFillToPosition(userId, symbol, qtyToBeFilled, bestPrice, "LONG", leverage)
                    let makerOrder = ORDERS.get(restingOrder.orderId)
                    
                    if(makerOrder){
                        makerOrder.filledQty += qtyToBeFilled;
                        makerOrder.fills.push(fill)
                    } 

                    if(restingOrder.filledQty === restingOrder.qty){
                        const updatedOrderBook = orders?.filter((f)=> f.orderId != restingOrder.orderId)
                        if(updatedOrderBook.length === 0){
                            orderBook.asks.delete(bestPrice)
                        } else {
                            orderBook.asks.set(bestPrice,updatedOrderBook!) // remove the resting order if filledQty === qty price and price if there is no resting order against that, from orderbook 
                        }
                    }
                   
                }
            }

            if(type === "limit" ){
                if(remainingQty > 0 ){
                    if(price === null) return new Error("Price is required in limit Order")
    
                    let restingOrder:RestingOrder = {
                        orderId,
                        userId,
                        side: "LONG",
                        type: "limit",
                        symbol,
                        filledQty,
                        qty,
                        status: filledQty > 0 ? "PARTIALLY_FILLED" : "OPEN" ,
                        price : price,
                        leverage,
                        createdAt
                    }
                    const levelBidsOrders = orderBook.bids.get(price) ?? []
                    levelBidsOrders.push(restingOrder)
                    orderBook.bids.set(price, levelBidsOrders)
                }

                 ORDERS.set(orderId, {
                    orderid : orderId,
                    userId,
                    qty,
                    filledQty,
                    price: price,
                    side: "LONG",
                    type: "limit",
                    symbol,
                    leverage,
                    margin: ((price! * qty) / leverage),
                    status: remainingQty > 0 ? "PARTIALLY_FILLED" : "FILLED",
                    fills: FILLS.filter((f)=> f.takerOrderId === orderId),
                    createdAt
                })
               
            }


            if(type === "market"){
                ORDERS.set(orderId, {
                    orderid : orderId,
                    userId,
                    qty,
                    filledQty,
                    price: null,
                    side: "LONG",
                    type: "market",
                    symbol,
                    leverage,
                    margin: marginToBeLocked,
                    status: remainingQty > 0 ? "PARTIALLY_FILLED" : "FILLED",
                    fills: FILLS.filter((f)=> f.takerOrderId === orderId),
                    createdAt
                })
                
                let balanceToBeReleased = marginToBeLocked - (totalValueOfOrder / leverage)
                USDBalance!.locked -= balanceToBeReleased;
                USDBalance!.available += balanceToBeReleased
            }
            
        }

    if(side === "SHORT"){

            const BidsPrices = orderBook.bids.keys()
            const bestBid = Math.max(...BidsPrices)
            let marginToBeLocked : number = 0

            if(type === "market"){
                marginToBeLocked = (((bestBid * qty) + ((sllipage/100) * (bestBid * qty)) ) / leverage )
            }

            if(type === "limit"){
            marginToBeLocked = (price! * qty) / leverage
            }

            if(USDBalance?.available! < marginToBeLocked!) return new Error("Insufficient Balance")

            USDBalance!.available -= marginToBeLocked!
            USDBalance!.locked += marginToBeLocked!

            const sortedBidsPrices = [...orderBook.bids.keys()].sort((a,b)=> b-a)

            let remainingQty = qty;
            let filledQty = 0;
            let totalValueOfOrder = 0
            let fills: Fill[] = []
            for(const bestPrice of sortedBidsPrices){
                if(remainingQty <= 0) break;

                if(type === "limit" && bestPrice < price!) break;

                let orders = orderBook.bids.get(bestPrice)

                if(!orders) return new Error("No liquidity available")

                for(const restingOrder of orders){
                    if(remainingQty <= 0) break ;

                    const remainingQtyInRestingOrder = restingOrder.qty - restingOrder.filledQty
                    const qtyToBeFilled = Math.min(remainingQtyInRestingOrder, remainingQty)
                    filledQty += qtyToBeFilled;
                    restingOrder.filledQty += qtyToBeFilled
                    remainingQty -= qtyToBeFilled
                    totalValueOfOrder += qtyToBeFilled * restingOrder.price

                    const fill : Fill = {
                        fillId: crypto.randomUUID(),
                        qty: qtyToBeFilled,
                        price: bestPrice,
                        makerOrderid: restingOrder.orderId,
                        takerOrderId: orderId,
                        symbol: symbol,
                        createdAt
                    }

                    FILLS.push(fill);
                    fills.push(fill);
                     applyFillToPosition(restingOrder.userId, symbol, qtyToBeFilled, bestPrice, "LONG", restingOrder.leverage)
                    applyFillToPosition(userId, symbol, qtyToBeFilled, bestPrice, "SHORT", leverage)

                    let makerOrder = ORDERS.get(restingOrder.orderId)

                    if(makerOrder){
                        makerOrder.filledQty += qtyToBeFilled;
                        makerOrder.fills.push(fill)
                    } 
                    if(restingOrder.filledQty === restingOrder.qty){
                        const updatedOrderBook = orders?.filter((f)=> f.orderId != restingOrder.orderId)
                        if(updatedOrderBook.length === 0){
                            orderBook.bids.delete(bestPrice)
                        } else {
                            orderBook.bids.set(bestPrice,updatedOrderBook!) // remove the resting order if filledQty === qty price and price if there is no resting order against that, from orderbook 
                        }
                    }
                    
                }


            }

            if(type === "limit"){
                if(remainingQty > 0){
                    if(price === null ) return new Error ("price is required in limit order")
                    
                    let restingOrder : RestingOrder = {
                         orderId,
                        userId,
                        side: "SHORT",
                        type: "limit",
                        symbol,
                        filledQty,
                        qty,
                        status: filledQty > 0 ? "PARTIALLY_FILLED" : "OPEN" ,
                        price : price,
                        leverage,
                        createdAt
                    }
                    const levelAsksOrders = orderBook.asks.get(price) ?? []
                    levelAsksOrders.push(restingOrder);
                    orderBook.asks.set(price, levelAsksOrders)
                }

                ORDERS.set(orderId, {
                    orderid: orderId,
                    userId,
                    qty,
                    filledQty,
                    price: price,
                    side: "SHORT",
                    type: "limit",
                    symbol,
                    leverage,
                    margin: ((price! * qty) / leverage),
                    status: remainingQty > 0 ? "PARTIALLY_FILLED" : "FILLED",
                    fills: FILLS.filter((f)=> f.takerOrderId === orderId),
                    createdAt
                })
            }

            if(type === "market"){
                ORDERS.set(orderId, {
                    orderid : orderId,
                    userId,
                    qty,
                    filledQty,
                    price: null,
                    side: "SHORT",
                    type: "market",
                    symbol,
                    leverage,
                    margin: marginToBeLocked,
                    status: remainingQty > 0 ? "PARTIALLY_FILLED" : "FILLED",
                    fills: FILLS.filter((f)=> f.takerOrderId === orderId),
                    createdAt
                })
                
                let balanceToBeReleased = marginToBeLocked - (totalValueOfOrder / leverage)
                USDBalance!.locked -= balanceToBeReleased;
                USDBalance!.available += balanceToBeReleased
            }

        }
    
}