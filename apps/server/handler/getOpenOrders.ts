import { loopback } from "../handler/loopback";

export async function getOpenOrders(marketId: string, userId: string) {
  const result = await loopback("get-open-orders", {
    userId,
    symbol: marketId,
  });
  const data = result as { orders?: any[] };
  return data?.orders ?? [];
}
