import { prisma } from "@repo/db";

export async function getOrders(marketId: string, userId: string) {
  const orders = await prisma.order.findMany({
    where: {
      userId,
      symbol: marketId,
    },
    orderBy: { createdAt: "desc" },
  });

  return orders;
}