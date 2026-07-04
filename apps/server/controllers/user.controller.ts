import type { Request, Response } from "express";
import { createUserSchema, loginUserSchema } from "../validator/user.validator";
import { prisma } from "@repo/db";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import "dotenv/config"

export async function signup(req: Request, res: Response){
    const body = createUserSchema.safeParse(req.body)

    if(!body.success){
        return res.status(400).json({
            error: body.error
        })
    }

    const data = body.data
    

    const existingUser = await prisma.user.findUnique({
        where:{
            email: data.email
        }
    })

    if(existingUser){
        res.status(400).json({
            error:"User already exists"
        })
    }

    const hashedpassword = bcrypt.hashSync(data.password, 10)

    const user = await prisma.user.create({
        data:{
            email:data.email,
            name: data.name,
            password: hashedpassword
        }
    })

    return res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email
    })
}

export async function signin(req: Request, res: Response){
    const jwtsecret = process.env.JWT_SECRET as unknown as string
    const body = loginUserSchema.safeParse(req.body)
    if(!body.success){
        return res.status(400).json({
            error: body.error
        })
    }

    const data = body.data
    const user = await prisma.user.findUnique({
        where:{
            email: data.email
        }
    })

    if(!user){
        return res.status(400).json({
            error: "User does not exist"
        })
    }

    const decodedPassword = bcrypt.compareSync(data.password, user.password)
    
    if(!decodedPassword){
        return res.status(400).json({
            error: "Incorrect Password"
        })
    }

    const token = jwt.sign({
        userid: user.id
    }, jwtsecret)

    return res.status(200).json({
        token: `Bearer ${token}`,
        user:{
            id: user.id,
            name: user.name,
            email: user.email
        }
    })
    
}