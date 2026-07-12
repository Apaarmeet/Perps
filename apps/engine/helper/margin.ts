import { BALANCES, ORDERS, POSITIONS } from "../exchangeStore";

/**
 * Keeps a user's collateral equal to the margin required by open positions
 * plus the unfilled portion of their resting limit orders.
 */
export function reconcileUserMargin(userId: string) {
  const usd = BALANCES.get(userId)?.USD;
  if (!usd) return;

  let requiredMargin = 0;

  for (const position of POSITIONS.get(userId)?.values() ?? []) {
    requiredMargin += position.margin;
  }

  for (const order of ORDERS.values()) {
    if (
      order.userId === userId &&
      order.type === "limit" &&
      (order.status === "open" || order.status === "partially_filled")
    ) {
      requiredMargin += ((order.qty - order.filledQty) * (order.price ?? 0)) / order.leverage;
    }
  }

  const delta = usd.locked - requiredMargin;
  usd.locked = requiredMargin;
  usd.available += delta;
}
