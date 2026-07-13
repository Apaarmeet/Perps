import { loopback } from "../handler/loopback";

export async function getAllOrders(userId: string) {
  const result = await loopback("get-orders", { userId });
  const data = result as { orders?: any[] };
  return data?.orders ?? [];
}