#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy 2>&1 || npx prisma db push --accept-data-loss 2>&1 || echo "WARNING: Prisma migration skipped, continuing..."

echo "Starting Next.js on port ${PORT:-3000}..."
exec node server.js
