import { ORDERS, FILLS, type getFillsInput } from "../exchangeStore";

export function handleGetFills(payload: getFillsInput) {
  const { userId, symbol } = payload;

  const userFills = FILLS.filter((fill) => {
    if (symbol && fill.symbol !== symbol) return false;
    const buyOrder = ORDERS.get(fill.takerOrderId);
    const sellOrder = ORDERS.get(fill.makerOrderid);
    return (buyOrder && buyOrder.userId === userId) || (sellOrder && sellOrder.userId === userId);
  });

  return { fills: userFills };
}
