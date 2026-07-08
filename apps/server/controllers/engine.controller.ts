import type { Request, Response } from "express";
import { cancelOrderSchema, createOrderSchema, onrampSchema } from "../validator/engine.validator";
import { loopback } from "../handler/loopback";
import { getOpenOrders } from "../handler/getOpenOrders";
import { getOrders } from "../handler/getOrders";
import { getFills } from "../handler/getFills";



export async function createorder(req: Request, res: Response) {
  const userId = req.userId;
  const body = req.body;

  const verify = createOrderSchema.safeParse(body);
  if (!verify.success) {
    return res.status(400).json({ error: "Invalid Input" });
  }
  const data = verify.data

  try {
    const response = await loopback("create-order", { userId, data });
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function cancelOrder(req: Request, res:Response){
    const userId = req.userId;
    const body = req.body;

    const verify = cancelOrderSchema.safeParse(body)
    if(!verify.success){
        return res.status(400).json({ message: "Invalid input" });
    }

    const orderId = verify.data.orderId

    try{
        const response = await loopback("cancel-order", {userId,orderId})
        res.status(200).json(response)
    } catch (err) {
        console.error("cancel order Error",{
            userId,
            orderId,
            error: err
        })
    }
}

export async function onRamp(req:Request, res: Response){
    const userId = req.userId
    const body = req.body

    const verify = onrampSchema.safeParse(body)
    if(!verify.success){
        return res.status(400).json({message:"Invalid Input"})
    }

    const {amount, symbol} = verify.data

    try {
        const response = await loopback("onRamp", {
            userId,
            symbol,
            amount
        })
        res.status(200).json({ response })
    } catch (err) {
        res.status(400).json({error: err})
    }
    
}

export async function openOrdersHandler(req: Request, res: Response) {
  const userId = req.userId;
  const marketId = req.params.marketId as string;

  if (!marketId) {
    return res.status(400).json({ error: "marketId is required" });
  }

  try {
    const orders = await getOpenOrders(marketId, userId);
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

export async function ordersHandler(req: Request, res: Response) {
  const userId = req.userId;
  const marketId = req.params.marketId as string;

  if (!marketId) {
    return res.status(400).json({ error: "marketId is required" });
  }

  try {
    const orders = await getOrders(marketId, userId);
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

export async function fillsHandler(req: Request, res: Response) {
  const userId = req.userId;

  try {
    const fills = await getFills(userId);
    res.status(200).json(fills);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}