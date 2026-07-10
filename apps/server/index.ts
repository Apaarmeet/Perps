import express from "express"
import { engineRouter } from "./routes/engine.routes"
import { userRouter } from "./routes/user.routes"


import { middleware } from "./middleware"

const app = express()

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

app.use(express.json())
app.use(userRouter)
app.use(middleware)
app.use(engineRouter)


app.listen(3000,()=>{
    console.log("Server is running on http://localhost:3000") 
})