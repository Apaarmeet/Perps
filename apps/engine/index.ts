import type { EngineRequest } from "./exchangeStore";

export function handleEngineRequest(message: EngineRequest){
    switch (message.type){
        case "onRamp":
            return handleOnRamp(message.payload) 
        case "create-order":
            return handleCreateOrder(message.payload) 
        case "cancel-order":
            return handleCancelOrder(message.payload) 
        case "get-depth":
            return handleGetDepth(message.payload)
        case "get-user-balance":
            return handleGetUserBalance(message.payload) 
        case "get-open-orders":
            return handleGetOrders(message.payload) 
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