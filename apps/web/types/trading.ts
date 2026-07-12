export type OrderType = "market" | "limit";
export type Side = "LONG" | "SHORT";
export type OrderStatus = "open" | "partially_filled" | "filled" | "cancelled";

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CandleResponse {
  time: string;
  symbol: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface PriceTick {
  symbol: string;
  price: string;
}

export interface DepthLevel {
  price: number;
  size: number;
  total: number;
}

export interface OrderbookData {
  bids: DepthLevel[];
  asks: DepthLevel[];
  spread: number;
  maxTotal: number;
}

export interface Position {
  userId: string;
  side: Side;
  qty: number;
  averagePrice: number;
  liquidationPrice: number;
  leverage: number;
  margin: number;
  pnl: number;
}

export interface Order {
  orderId: string;
  userId: string;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  price: number | null;
  qty: number;
  filledQty: number;
  margin: number;
  Status: OrderStatus;
  createdAt: string;
}

export interface Fill {
  fillId: string;
  symbol: string;
  Price: number;
  qty: number;
  buyorderId: string;
  sellOrderId: string;
  createdAt: string;
}

export interface Balance {
  available: number;
  locked: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateOrderPayload {
  type: OrderType;
  side: Side;
  symbol: string;
  price: number | null;
  qty: number;
  leverage: number;
  sllipage: number;
}

export interface WsMessage {
  commandType?: string;
  data?: string;
  symbol?: string;
  price?: string;
}

export interface CandleWsData {
  key: string;
  candle: {
    open: number;
    high: number;
    low: number;
    close: number;
    timestamp: number;
  };
}

export type MarketSymbol = "BTCUSD" | "ETHUSD" | "SOLUSD";
export type CandleInterval = "1m" | "5m" | "30m";
