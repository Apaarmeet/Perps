export type OrderType = "market" | "limit";
export type Side = "LONG" | "SHORT";

export interface CreateOrderPayload {
  type: OrderType;
  side: Side;
  symbol: string;
  price: number | null;
  qty: number;
  leverage: number;
  slippage: number;
}

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; name: string };
}

export interface OrderResponse {
  order: {
    orderid: string;
    status: string;
    side: string;
    price: number | null;
    qty: number;
    symbol: string;
  };
  fills: unknown[];
}
