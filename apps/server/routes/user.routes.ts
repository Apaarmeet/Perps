import { Router } from "express";
import { signin, signup } from "../controllers/user.controller";

export const userRouter = Router()

userRouter.post("/signup", signup)
userRouter.post("/signin", signin)
