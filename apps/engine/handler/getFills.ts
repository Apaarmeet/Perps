import { USER_FILLS, type getFillsInput } from "../exchangeStore";

export function handleGetFills(payload: getFillsInput) {
  const { userId, symbol } = payload;

  const userFills = USER_FILLS.get(userId) ?? [];
  
  if (symbol) {
    return { fills: userFills.filter(f => f.symbol === symbol) };
  }

  return { fills: userFills };
}
