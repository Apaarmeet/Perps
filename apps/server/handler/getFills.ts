import { loopback } from "../handler/loopback";

export async function getFills(userId: string) {
  const result = await loopback("get-fills", { userId });
  const data = result as { fills?: any[] };
  return data?.fills ?? [];
}
