import { prisma } from "@repo/db";

export async function getFills(userId: string) {
  const userOrderIds = await prisma.order.findMany({
    where: { userId },
    select: { orderId: true },
  });

  if (userOrderIds.length === 0) return [];

  const ids = userOrderIds.map(o => o.orderId);

  const fills = await prisma.fill.findMany({
    where: {
      OR: [
        { buyorderId: { in: ids } },
        { sellOrderId: { in: ids } },
      ],
    },
    include: {
      buyOrder: { select: { side: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return fills.map(f => ({
    fillId: f.fillId,
    symbol: f.symbol,
    price: Number(f.Price),
    qty: Number(f.qty),
    buyorderId: f.buyorderId,
    sellOrderId: f.sellOrderId,
    buyOrder: f.buyOrder,
    createdAt: f.createdAt.getTime(),
  }));
}
