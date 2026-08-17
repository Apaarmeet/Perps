import { BALANCES, type getUserBalanceInput } from "../exchangeStore";
import { reconcileUserMargin } from "../helper/margin";

export function handleGetUserBalance(payload: getUserBalanceInput){
    const {userId} = payload;
    reconcileUserMargin(userId);
    const balance = BALANCES.get(userId);

    return {
        userId,
        balance
    };
}