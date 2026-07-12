import { Router } from "express";
import { cancelOrder, createorder, onRamp, openOrdersHandler, ordersHandler, fillsHandler, getUserBalance, getPositions, getDepth } from "../controllers/engine.controller";
import { middleware } from "../middleware";

export const engineRouter = Router()

engineRouter.use(middleware)


engineRouter.post("/onRamp",onRamp)
engineRouter.post("/order", createorder)
engineRouter.delete("/order", cancelOrder)
engineRouter.get("/equity/available", getUserBalance)
engineRouter.get("/positions/:marketId", getPositions);
engineRouter.get("/depth/:marketId", getDepth)
engineRouter.get("/orders/open/:marketId", openOrdersHandler)
engineRouter.get("/orders/:marketId", ordersHandler)
engineRouter.get("/fills", fillsHandler);