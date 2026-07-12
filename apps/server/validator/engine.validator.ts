import z from "zod"

export const createOrderSchema = z.object({
  type: z.enum(["market", "limit"]),
  side: z.enum(["LONG", "SHORT"]),
  symbol: z.string().min(1),
  price: z.number().nullable(),
  qty: z.number().positive(),
  leverage: z.number().positive(),
  sllipage: z.number().nonnegative(),
});



export const cancelOrderSchema = z.object({
  orderId: z.string()
})

export const getdepthSchema = z.object({
  symbol: z.string()
})

export const onrampSchema = z.object({
  amount: z.number().positive()
})
