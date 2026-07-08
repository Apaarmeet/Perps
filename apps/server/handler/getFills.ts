import { prisma } from "@repo/db";

export async function getFills(userId: string) {
  const fills = await prisma.fill.findMany({
    where: {
      OR: [
        { buyOrder: { userId } },
        { sellOrder: { userId } },
      ],
    },
    include: {
      buyOrder: { select: { orderId: true, side: true } },
      sellOrder: { select: { orderId: true, side: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return fills;
}