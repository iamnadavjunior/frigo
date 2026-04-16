#!/bin/sh
set -e

echo "Waiting for database to be ready..."
MAX_RETRIES=30
RETRY=0
until node -e "
  const net = require('net');
  const u = new URL(process.env.DATABASE_URL.replace(/^postgres(ql)?:\/\//, 'http://'));
  const s = net.createConnection({ host: u.hostname, port: Number(u.port) || 5432 });
  s.on('connect', () => { s.destroy(); process.exit(0); });
  s.on('error', () => process.exit(1));
" 2>/dev/null; do
  RETRY=$((RETRY + 1))
  if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Database not reachable after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi
  echo "  Attempt $RETRY/$MAX_RETRIES - retrying in 2s..."
  sleep 2
done
echo "Database is ready."

echo "Running Prisma migrations..."
npx prisma migrate deploy || {
  echo "migrate deploy failed, falling back to db push..."
  npx prisma db push --accept-data-loss
}

echo "Starting Next.js..."
exec node server.js
