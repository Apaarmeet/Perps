import { BALANCES, type onrampInput } from "../exchangeStore";

export function handleOnRamp(payload: onrampInput){
    const {userId, amount} = payload

    if(amount <= 0) {
        throw new Error("Amount must be positive")
    }


    let userBalance = BALANCES.get(userId)

    if(!userBalance){
        userBalance = {}
        BALANCES.set(userId,userBalance)
    }

    if(!userBalance["USD"]){
        userBalance["USD"] = {
            available : 0,
            locked : 0
        }
    }

    userBalance["USD"].available += amount

    return {
        userId,
        balance: userBalance,
    }

}
