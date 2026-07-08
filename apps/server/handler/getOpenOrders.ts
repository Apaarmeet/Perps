import { prisma } from "@repo/db";

export async function getOpenOrders(marketId: string, userId: string) {
  const orders = await prisma.order.findMany({
    where: {
      userId,
      symbol: marketId,
      Status: "open",
    },
    orderBy: { createdAt: "desc" },
  });

  return orders;
}