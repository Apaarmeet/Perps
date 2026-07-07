import { ORDERS, FILLS } from "../exchangeStore";

export function handleGetFills(payload: Record<string, unknown>) {
  const { userId, symbol } = payload as { userId: string; symbol?: string };

  const userFills = FILLS.filter((fill) => {
    if (symbol && fill.symbol !== symbol) return false;
    const buyOrder = ORDERS.get(fill.takerOrderId);
    const sellOrder = ORDERS.get(fill.makerOrderid);
    return (buyOrder && buyOrder.userId === userId) || (sellOrder && sellOrder.userId === userId);
  });

  return { fills: userFills };
}
