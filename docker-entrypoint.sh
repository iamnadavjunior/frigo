#!/bin/sh
set -e

echo "Running database initialization..."
node scripts/init-db.cjs 2>&1 || echo "WARNING: init-db.cjs failed or already applied, continuing..."

echo "Starting Next.js on port ${PORT:-3000}..."
exec node server.js
