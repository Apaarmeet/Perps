import { BALANCES, ORDERS, POSITIONS, USER_OPEN_ORDERS } from "../exchangeStore";

export function reconcileUserMargin(userId: string) {
  const usd = BALANCES.get(userId)?.USD;
  if (!usd) return;

  const totalEquity = usd.available + usd.locked;
  let requiredMargin = 0;

  for (const position of POSITIONS.get(userId)?.values() ?? []) {
    requiredMargin += position.margin;
  }

  const userOpenOrderIds = USER_OPEN_ORDERS.get(userId) ?? new Set();
  for (const orderId of userOpenOrderIds) {
    const order = ORDERS.get(orderId);
    if (order && order.type === "limit" && (order.status === "open" || order.status === "partially_filled")) {
      requiredMargin += ((order.qty - order.filledQty) * (order.price ?? 0)) / order.leverage;
    }
  }

  usd.locked = requiredMargin;
  usd.available = Math.max(0, totalEquity - requiredMargin);
}
