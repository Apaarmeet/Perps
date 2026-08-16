#!/bin/sh
set -e

echo "Starting deployment setup..."

# 1. Ensure snapshot directory exists for matching engine
mkdir -p /app/data/snapshot

# 2. Run Database Migrations if DATABASE_URL is provided
if [ -n "$DATABASE_URL" ]; then
  echo "Running Prisma migrations..."
  cd /app/packages/db
  bunx prisma generate
  bunx prisma migrate deploy || echo "Migration warning: could not run migrations, continuing..."
  cd /app
fi

echo "Starting background services..."

# 3. Start Trading Engine in background
bun run apps/engine/index.ts &
ENGINE_PID=$!
echo "Engine started with PID: $ENGINE_PID"

# 4. Start DB-Puller in background
bun run apps/db-puller/index.ts &
DB_PULLER_PID=$!
echo "DB-Puller started with PID: $DB_PULLER_PID"

# 5. Start WebSocket Gateway in background
bun run apps/wssConnections/index.ts &
WSS_PID=$!
echo "WSS Gateway started with PID: $WSS_PID"

# Graceful shutdown handler
cleanup() {
  echo "Stopping all services..."
  kill -TERM "$ENGINE_PID" "$DB_PULLER_PID" "$WSS_PID" 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# 6. Start REST API Server in foreground
echo "Starting REST API Server on port ${PORT:-3000}..."
exec bun run apps/server/index.ts
