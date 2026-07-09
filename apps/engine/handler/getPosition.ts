import { POSITIONS, type getPositionInput } from "../exchangeStore";

export function handleGetPosition(payload: getPositionInput){
    const {userId, symbol} = payload

    const userPosition = POSITIONS.get(userId)
        if(!userPosition) return { position: null }

           const position = userPosition.get(symbol)

           return {
            position: position ?? null
           }
}