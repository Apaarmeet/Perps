import { BALANCES, type getUserBalanceInput } from "../exchangeStore";

export function handleGetUserBalance(payload: getUserBalanceInput){
    const {userId} = payload

    const balance = BALANCES.get(userId)

    return {
        userId,
        balance
    }

}