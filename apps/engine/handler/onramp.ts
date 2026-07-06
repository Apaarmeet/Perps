import { BALANCES, type onrampInput } from "../exchangeStore";

export async function handleOnRamp(payload: onrampInput){
    const {userId, symbol, amount} = payload

    if(amount <= 0) {
        return new Error("Amount mudt be positive")
    }


    let userBalance = BALANCES.get(userId)

    if(!userBalance){
        userBalance = {}
        BALANCES.set(userId,userBalance)
    }

    if(!userBalance[symbol]){
        userBalance[symbol] = {
            available : 0,
            locked : 0
        }
    }

    userBalance[symbol].available += amount

} 