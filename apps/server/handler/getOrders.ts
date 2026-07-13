import { loopback } from "../handler/loopback";

export async function getOrders(marketId: string, userId: string) {
  const result = await loopback("get-orders", {
    userId,
    symbol: marketId,
  });
  const data = result as { orders?: any[] };
  return data?.orders ?? [];
}
