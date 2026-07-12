import z from "zod"

export const createOrderSchema = z.object({
  userId: z.string().optional(),
  type: z.enum(["market", "limit"]),
  side: z.enum(["LONG", "SHORT"]),
  symbol: z.string(),
  price: z.number().nullable(),
  qty: z.number(),
  leverage: z.number(),
  sllipage: z.number(),
});



export const cancelOrderSchema = z.object({
  userId: z.string().optional(),
  orderId: z.string()
})

export const getdepthSchema = z.object({
  symbol: z.string()
})

export const onrampSchema = z.object({
  userId: z.string().optional(),
  amount: z.number().positive()
})