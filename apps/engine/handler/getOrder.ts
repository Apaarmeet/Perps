import { ORDERS, USER_ORDERS, type getOrderInput } from "../exchangeStore";

export function handleGetOrder(payload: getOrderInput) {
    const { userId, orderId, symbol } = payload

    if (orderId) {
        const order = ORDERS.get(orderId)
        if (order && order.userId === userId) {
            return { order }
        }
        return { order: undefined }
    }

    const userOrderIds = USER_ORDERS.get(userId) ?? new Set();
    const orders = [];

    for (const id of userOrderIds) {
        const order = ORDERS.get(id);
        if (!order) continue;
        if (symbol && order.symbol !== symbol) continue;
        orders.push(order);
    }

    return { orders }
}