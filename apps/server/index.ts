import express from "express"
import { engineRouter } from "./routes/engine.routes"
import { userRouter } from "./routes/user.routes"


const app = express()

app.use(engineRouter)
app.use(userRouter)


app.listen(3000,()=>{
    console.log("Server is running on http://localhost:3000") 
})