# ── Stage 1: Install dependencies ──
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci

# ── Stage 2: Build ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Compile seed script to plain JS (so it runs with just 'node' at startup)
RUN npx esbuild prisma/seed.ts --bundle --platform=node --outfile=prisma/seed.cjs \
    --external:@prisma/client --external:@prisma/adapter-pg --external:pg --external:bcryptjs --external:dotenv

# ── Stage 3: Production runner ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma files for migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv

# Copy pg driver and full dependency tree (needed at runtime by db.ts and @prisma/adapter-pg)
COPY --from=builder /app/node_modules/pg ./node_modules/pg
COPY --from=builder /app/node_modules/pg-connection-string ./node_modules/pg-connection-string
COPY --from=builder /app/node_modules/pg-pool ./node_modules/pg-pool
COPY --from=builder /app/node_modules/pg-protocol ./node_modules/pg-protocol
COPY --from=builder /app/node_modules/pg-types ./node_modules/pg-types
COPY --from=builder /app/node_modules/pg-int8 ./node_modules/pg-int8
COPY --from=builder /app/node_modules/pgpass ./node_modules/pgpass
COPY --from=builder /app/node_modules/split2 ./node_modules/split2
COPY --from=builder /app/node_modules/postgres-array ./node_modules/postgres-array
COPY --from=builder /app/node_modules/postgres-bytea ./node_modules/postgres-bytea
COPY --from=builder /app/node_modules/postgres-date ./node_modules/postgres-date
COPY --from=builder /app/node_modules/postgres-interval ./node_modules/postgres-interval

# Copy compiled seed script and its runtime deps
COPY --from=builder /app/prisma/seed.cjs ./prisma/seed.cjs
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Create uploads directory
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
