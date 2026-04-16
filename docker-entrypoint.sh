#!/bin/sh
set -e

echo "Waiting for database..."
until node -e "const{Client}=require('pg');const c=new Client(process.env.DATABASE_URL);c.connect().then(()=>{c.end();process.exit(0)}).catch(()=>process.exit(1))" 2>/dev/null; do
  sleep 2
done

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting Next.js..."
exec node server.js
