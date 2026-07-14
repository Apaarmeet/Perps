import { prisma } from "@repo/db";

export async function getOrders(marketId: string, userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId, symbol: marketId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return orders.map(o => ({
    orderid: o.orderId,
    userId: o.userId,
    symbol: o.symbol,
    side: o.side === "buy" ? "LONG" : "SHORT",
    type: o.type,
    price: o.price ? Number(o.price) : null,
    qty: Number(o.qty),
    filledQty: Number(o.filledQty),
    margin: Number(o.margin),
    status: o.Status,
    createdAt: o.createdAt.getTime(),
  }));
}
