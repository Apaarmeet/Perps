
export type orderType = "market" | "limit"
export type Side = "LONG" | "SHORT"
export type OrderStatus = "FILLED" | "PARTIALLY_FILLED" | "OPEN" | "CANCELLED"

export type EngineCommandType =
  | "create-order"
  | "get-depth"
  | "get-user-balance"
  | "get-order"
  | "cancel-order"
  | "get-position"
  | "get-user-position"
  | "onRamp"
  | "get-open-orders"
  | "get-orders"
  | "get-fills"
  | "price-update"

export interface EngineRequest {
  correlationId: string,
  type: EngineCommandType,
  payload: Record<string, unknown>
}
export interface getUserBalanceInput {
  userId: string
}
export interface getUserPositionInput {
  userId: string
}
export interface getOrderInput {
  userId: string;
  symbol: string;
}

export interface createOrderInput  {
    userId : string,
    type: orderType,
    side: Side,
    symbol: string,
    price: number | null,
    qty: number,
    leverage: number,
    sllipage: number
}

export interface cancelOrderInput {
    userId: string,
    orerId: string
}
export interface onrampInput {
    userId : string,
    symbol: string,
    amount: number
}
export interface getPositionInput {
  userId: string
  symbol: string
}

export interface RestingOrder {
    orderId: string,
    userId: string,
    side: Side,
    type: "limit",
    symbol: string,
    filledQty: number,
    qty: number,
    status: OrderStatus,
    price: number,
    leverage: number,
    createdAt: number
}

export interface OrderBook {
    bids: Map<number, RestingOrder[]>
    asks: Map<number, RestingOrder[]>
}

export interface Fill {
    fillId: string,
    qty: number,
    makerOrderid: string,
    takerOrderId: string,
    price: number,
    symbol: string,
    createdAt: number
}

export interface getDepthInput{
    symbol:string
}

export interface OrderRecord {
    orderid: string,
    userId: string,
    qty: number,
    filledQty: number,
    price: number | null,
    side: Side,
    type: orderType,
    symbol: string,
    margin: number,
    leverage: number,
    status: OrderStatus,
    fills: Fill[],
    createdAt: number; 
}

export interface Position {
    userId: string,
    side: Side,
    qty: number,
    averagePrice: number,
    liquidationPrice: number,
    leverage: number,
    margin : number,
    pnl: number,
}

export interface Balance {
    available: number,
    locked: number
}

export const BALANCES = new Map<string, Record<string, Balance>>()
export const ORDERBOOK = new Map<string, OrderBook>()
export const POSITIONS = new Map<string, Map<string, Position>>() 
export const ORDERS = new Map<string, OrderRecord>()
export const FILLS: Fill[] = []

