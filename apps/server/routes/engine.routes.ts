import { Router } from "express";
import { createorder } from "../controllers/engine.controller";

export const engineRouter = Router()

engineRouter.post("/onRamp",(req,res)=>{})
engineRouter.post("/order", createorder)
engineRouter.delete("/order", (req, res) => {})
engineRouter.get("/equity/available", (req, res) => {})
engineRouter.get("/positions/open/:marketId", (req, res) => {});
engineRouter.get("/positions/closed/:marketId", (req, res) => {});
engineRouter.get("/orders/open/:marketId", (req, res) => {})
engineRouter.get("/orders/:marketId", (req, res) => {})
engineRouter.get("/fills", (req, res) => {});