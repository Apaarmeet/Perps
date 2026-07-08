import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken"
import "dotenv/config"


interface MyTokenPayload extends JwtPayload {
    userId: string;
}

export async function middleware(req: Request, res: Response, next: NextFunction) {
    const authHeaders = req.headers['authorization']

    const jwtsecret = process.env.JWT_SECRET as unknown as string
    const token = authHeaders?.split(" ")[1]

    if (!token) {
        return res.status(401).json({
            error: "Token not found"
        })
    }

    let verify: MyTokenPayload;
    try {
        verify = jwt.verify(token, jwtsecret) as MyTokenPayload;
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = verify.userId


    req.userId = userId

    next()
}