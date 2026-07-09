import {getRedisClient} from "@repo/redis"
import { handleEngineRequest } from "./requestHandler";


const readClient = await getRedisClient()
const writeclient = await getRedisClient()

export async function consumeEngineRequests(){
    while (true){
        const streams = await readClient.xRead(
            [{key:"engine:commands", id: "$"}],
            {BLOCK: 0}
        );

        for(const stream of streams! ){
            for(const msg of stream.messages){
                const {type, correlationId, responseStream, payload} = msg.message;

                try{
                    const result  = handleEngineRequest({
                        correlationId: correlationId ,
                        type: type,
                        payload: JSON.parse(payload)
                    })

                    await writeclient.xAdd(responseStream as string, "*", {
                        correlationId: correlationId as string,
                        ok: "true",
                        data: JSON.stringify(result)
                    });
                } catch (err) {
                    await writeclient.xAdd(responseStream as string , "*", {
                        correlationId: correlationId as string,
                        ok: "false",
                        error: String((err as Error).message)
                    })
                }
            }
        }
        
    }
}