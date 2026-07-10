import {getRedisClient} from "@repo/redis"
import { handleEngineRequest } from "./requestHandler";


const readClient = await getRedisClient()
const writeclient = await getRedisClient()
let lastId = "$"
export async function consumeEngineRequests(){
    while (true){
        const streams = await readClient.xRead(
            [{key:"engine:commands", id: lastId}],
            {BLOCK: 0}
        );

        for(const stream of streams! ){
            for(const msg of stream.messages){
                const {type, correlationId, responseStream, payload} = msg.message;
                lastId = msg.id

                try{
                    const result  = await handleEngineRequest({
                        correlationId: correlationId ,
                        type: type,
                        payload: JSON.parse(payload)
                    })

                    await writeclient.xAdd(responseStream as string, "*", {
                        correlationId: correlationId as string,
                        ok: "true",
                        data: JSON.stringify(result)
                    });
                     await writeclient.xAdd("engine:db-writes", "*", {
                            correlationId,
                            commandType: type,
                            ok:"true",
                            data: JSON.stringify(result),
                    });
                    await writeclient.xAdd("engine-dataStream", "*", {
                            commandType: type,
                            data: JSON.stringify(result),
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