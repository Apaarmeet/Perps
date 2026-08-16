FROM oven/bun:1.3.13-alpine

# Install local Redis server inside the container
RUN apk add --no-cache redis

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY turbo.json ./
COPY start.sh ./

RUN bun install 
RUN cd packages/db && bunx prisma generate || true
RUN chmod +x /app/start.sh

EXPOSE 3000 3002

CMD ["/app/start.sh"]
