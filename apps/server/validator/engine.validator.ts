import z from "zod"

export const createOrderSchema = z.object({
  userId: z.string(),
  type: z.enum(["MARKET", "LIMIT"]),
  side: z.enum(["BUY", "SELL"]),
  symbol: z.string(),
  price: z.number().nullable(),
  qty: z.number(),
  leverage: z.number(),
  sllipage: z.number(),
});



export const cancelOrderSchema = z.object({
  userId: z.string(),
  orderId: z.string()
})

export const getdepthSchema = z.object({
  symbol: z.string()
})

export const onrampSchema = z.object({
  userId: z.string(),
  symbol: z.string(),
  amount: z.number().positive()
})