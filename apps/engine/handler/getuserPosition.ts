import { POSITIONS, type getUserPositionInput } from "../exchangeStore";

export function handleGetUserPosition(payload: getUserPositionInput){
    const {userId} = payload

    const userPosition = POSITIONS.get(userId)

    return {
        userPosition
    }
}