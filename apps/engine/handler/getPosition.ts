import { POSITIONS, type getPositionInput } from "../exchangeStore";

export function handleGetPosition(message : Record<string,unknown>){
    const {userId, symbol} = message as unknown as getPositionInput

    const userPosition = POSITIONS.get(userId)
        if(!userPosition) return { position: null }

           const position = userPosition.get(symbol)

           return {
            position: position ?? null
           }
}