# Build context: project root (c:\wamp64\www\frigo)
# docker-compose sets: context: . dockerfile: apps/brarudi/Dockerfile

# ── Stage 1: Install dependencies ──
FROM node:20-alpine AS deps
WORKDIR /app

# Prisma schema lives in the root
COPY prisma ./prisma/
COPY prisma.config.ts ./

# App package files
COPY apps/brarudi/package.json apps/brarudi/package-lock.json* ./
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# ── Stage 2: Build ──
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Copy app source (next.config.ts, src/, public/, tsconfig.json, etc.)
COPY apps/brarudi/. .

# Bring in Prisma schema so the build can reference it
COPY --from=deps /app/prisma ./prisma/

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ── Stage 3: Production runner ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Standalone bundle includes its own node_modules subset, but we need
# the Prisma client and pg adapter for runtime DB access
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/pg ./node_modules/pg
COPY --from=builder /app/node_modules/pg-pool ./node_modules/pg-pool
COPY --from=builder /app/node_modules/pg-protocol ./node_modules/pg-protocol
COPY --from=builder /app/node_modules/pg-types ./node_modules/pg-types
COPY --from=builder /app/node_modules/pgpass ./node_modules/pgpass
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/jose ./node_modules/jose

USER nextjs

EXPOSE 3002

CMD ["node", "server.js"]
