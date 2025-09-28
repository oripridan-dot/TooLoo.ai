FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
COPY packages/core/package.json ./packages/core/
COPY packages/engine/package.json ./packages/engine/
COPY packages/api/package.json ./packages/api/
COPY packages/web/package.json ./packages/web/

RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the packages
RUN npm run build

# Production image, copy all the files and run the server
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 tooloo

# Create data directory for SQLite
RUN mkdir -p /app/data && chown tooloo:nodejs /app/data

COPY --from=builder --chown=tooloo:nodejs /app/packages/api/dist ./packages/api/dist
COPY --from=builder --chown=tooloo:nodejs /app/packages/core/dist ./packages/core/dist  
COPY --from=builder --chown=tooloo:nodejs /app/packages/engine/dist ./packages/engine/dist
COPY --from=builder --chown=tooloo:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=tooloo:nodejs /app/package.json ./package.json

USER tooloo

EXPOSE 3001

ENV PORT 3001

CMD ["node", "packages/api/dist/server.js"]