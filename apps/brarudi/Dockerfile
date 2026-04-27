# Build context: project root
# docker-compose sets: context: . dockerfile: apps/brarudi/Dockerfile

# ── Stage 1: Install dependencies ──
# Uses the ROOT workspace package-lock.json (npm workspaces: one lockfile for all apps)
FROM node:20-alpine AS deps
WORKDIR /app

# Root workspace manifest + lockfile
COPY package.json package-lock.json ./

# All workspace members' package.json required by npm workspaces
COPY apps/technician/package.json ./apps/technician/package.json
COPY apps/brarudi/package.json ./apps/brarudi/package.json

# Prisma schema
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install all workspace deps from root lockfile
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# ── Stage 2: Build ──
FROM node:20-alpine AS builder
WORKDIR /app

# Root node_modules (workspace-hoisted deps)
COPY --from=deps /app/node_modules ./node_modules

# Only the brarudi app source + prisma
COPY apps/brarudi ./apps/brarudi
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/prisma.config.ts ./

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build from inside the app directory so .next output is relative to the app
WORKDIR /app/apps/brarudi
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

# Standalone output: server.js + internal node_modules + public + static
COPY --from=builder /app/apps/brarudi/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/brarudi/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/brarudi/.next/static ./.next/static

# Copy runtime-critical deps that standalone tracing may miss
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps /app/node_modules/pg ./node_modules/pg
COPY --from=deps /app/node_modules/pg-pool ./node_modules/pg-pool
COPY --from=deps /app/node_modules/pg-protocol ./node_modules/pg-protocol
COPY --from=deps /app/node_modules/pg-types ./node_modules/pg-types
COPY --from=deps /app/node_modules/pgpass ./node_modules/pgpass
COPY --from=deps /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=deps /app/node_modules/jose ./node_modules/jose

USER nextjs

EXPOSE 3002

CMD ["node", "server.js"]
