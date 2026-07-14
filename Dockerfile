FROM oven/bun:1.3.13-alpine

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY turbo.json ./

RUN bun install 
