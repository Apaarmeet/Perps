import { ORDERS, type getOpenOrdersInput } from "../exchangeStore"

export function handleGetOpenOrder(payload: getOpenOrdersInput) {
  const { userId, symbol, status } = payload

  const orders = [...ORDERS.values()].filter((order) => {
    if (order.userId !== userId) return false
    if (order.symbol !== symbol) return false
    if (order.status !== "open" && order.status !== "partially_filled") return false
    if (status && order.status !== status) return false
    return true
  })

  return { orders }
}
