#!/bin/sh
set -e

echo "Starting deployment setup..."

# 1. Start local Redis server if no external REDIS_URL is configured
if [ -z "$REDIS_URL" ] || [ "$REDIS_URL" = "redis://127.0.0.1:6379" ] || [ "$REDIS_URL" = "redis://localhost:6379" ]; then
  echo "Starting embedded local Redis server..."
  redis-server --daemonize yes --protected-mode no
  export REDIS_URL="redis://127.0.0.1:6379"
  sleep 1
fi

# 2. Ensure snapshot directory exists for matching engine
mkdir -p /app/data/snapshot

# 3. Run Database Migrations in background so port 3000 opens instantly
if [ -n "$DATABASE_URL" ]; then
  (
    echo "Running Prisma migrations..."
    cd /app/packages/db
    bunx prisma migrate deploy || echo "Migration warning: could not run migrations, continuing..."
  ) &
fi

echo "Starting background services..."

# 4. Start Trading Engine in background
bun run apps/engine/index.ts &
ENGINE_PID=$!
echo "Engine started with PID: $ENGINE_PID"

# 5. Start DB-Puller in background
bun run apps/db-puller/index.ts &
DB_PULLER_PID=$!
echo "DB-Puller started with PID: $DB_PULLER_PID"

# 6. Start WebSocket Gateway in background
bun run apps/wssConnections/index.ts &
WSS_PID=$!
echo "WSS Gateway started with PID: $WSS_PID"

# Graceful shutdown handler
cleanup() {
  echo "Stopping all services..."
  kill -TERM "$ENGINE_PID" "$DB_PULLER_PID" "$WSS_PID" 2>/dev/null || true
  redis-cli shutdown nosave 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# 7. Start REST API Server in foreground immediately
echo "Starting REST API Server on 0.0.0.0:${PORT:-3000}..."
exec bun run apps/server/index.ts
