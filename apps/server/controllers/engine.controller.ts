import type { Request, Response } from "express";
import { createOrderSchema } from "../validator/engine.validator";
import { loopback } from "../handler/loopback";



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
