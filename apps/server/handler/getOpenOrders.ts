import { prisma } from "@repo/db";

export async function getOpenOrders(marketId: string, userId: string) {
  const orders = await prisma.order.findMany({
    where: {
      userId,
      symbol: marketId,
      Status: { in: ["open", "partially_filled"] },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders;
}
