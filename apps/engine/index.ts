import type { EngineRequest } from "./exchangeStore";
import { handleCancelOrder } from "./handler/cancelOrder";
import { handleCreateOrder } from "./handler/createOrder";
import { handleGetDepth } from "./handler/getDepth";
import { handleGetFills } from "./handler/getFills";
import { handleGetOpenOrder } from "./handler/getOpenOrders";
import { handleGetOrder } from "./handler/getOrder";
import { handleGetPosition } from "./handler/getPosition";
import { handleGetUserBalance } from "./handler/getUserBalance";
import { handleGetUserPosition } from "./handler/getuserPosition";
import { handleOnRamp } from "./handler/onramp";

export function handleEngineRequest(message: EngineRequest){
    switch (message.type){
        case "onRamp":
            return handleOnRamp(message.payload) 
        case "create-order":
            return handleCreateOrder(message.payload ) 
        case "cancel-order":
            return handleCancelOrder(message.payload) 
        case "get-depth":
            return handleGetDepth(message.payload)
        case "get-user-balance":
            return handleGetUserBalance(message.payload) 
        case "get-open-orders":
            return handleGetOpenOrder(message.payload) 
        case "get-orders":
            return handleGetOrder(message.payload)
        case "get-position":
            return handleGetPosition(message.payload) 
        case "get-user-position":
            return handleGetUserPosition(message.payload) 
        case "get-fills":
            return handleGetFills(message.payload)
        case "price-update":
            return handlePriceUpdate(message.payload)
        default:
            throw new Error(`Unknown command type`)
    }
}