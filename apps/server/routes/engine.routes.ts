import { Router } from "express";
import { cancelOrder, createorder, onRamp, openOrdersHandler, ordersHandler, fillsHandler } from "../controllers/engine.controller";

export const engineRouter = Router()

engineRouter.post("/onRamp",onRamp)
engineRouter.post("/order", createorder)
engineRouter.delete("/order", cancelOrder)
engineRouter.get("/equity/available", (req, res) => {})
engineRouter.get("/positions/open/:marketId", (req, res) => {});
engineRouter.get("/positions/closed/:marketId", (req, res) => {});
engineRouter.get("/orders/open/:marketId", openOrdersHandler)
engineRouter.get("/orders/:marketId", ordersHandler)
engineRouter.get("/fills", fillsHandler);