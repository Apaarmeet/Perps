import { ORDERS, USER_OPEN_ORDERS, type getOpenOrdersInput } from "../exchangeStore"

export function handleGetOpenOrder(payload: getOpenOrdersInput) {
  const { userId, symbol, status } = payload

  const openOrderIds = USER_OPEN_ORDERS.get(userId) ?? new Set();
  const orders = [];

  for (const orderId of openOrderIds) {
    const order = ORDERS.get(orderId);
    if (!order) continue;
    if (order.symbol !== symbol) continue;
    if (order.status !== "open" && order.status !== "partially_filled") continue;
    if (status && order.status !== status) continue;
    orders.push(order);
  }

  return { orders }
}
