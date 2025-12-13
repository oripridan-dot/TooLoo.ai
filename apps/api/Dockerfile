# =============================================================================
# @tooloo/api - Production Dockerfile
# Multi-stage build for optimized production image
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./

# Copy all packages (needed for workspace dependencies)
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages in order
RUN pnpm --filter @tooloo/core build && \
    pnpm --filter @tooloo/contracts build && \
    pnpm --filter @tooloo/skills build && \
    pnpm --filter @tooloo/providers build && \
    pnpm --filter @tooloo/memory build && \
    pnpm --filter @tooloo/engine build && \
    pnpm --filter @tooloo/api build

# -----------------------------------------------------------------------------
# Stage 2: Production
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

# Create non-root user for security
RUN addgroup -g 1001 -S tooloo && \
    adduser -S tooloo -u 1001

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/contracts/package.json ./packages/contracts/
COPY --from=builder /app/packages/skills/dist ./packages/skills/dist
COPY --from=builder /app/packages/skills/package.json ./packages/skills/
COPY --from=builder /app/packages/providers/dist ./packages/providers/dist
COPY --from=builder /app/packages/providers/package.json ./packages/providers/
COPY --from=builder /app/packages/memory/dist ./packages/memory/dist
COPY --from=builder /app/packages/memory/package.json ./packages/memory/
COPY --from=builder /app/packages/engine/dist ./packages/engine/dist
COPY --from=builder /app/packages/engine/package.json ./packages/engine/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Copy skills directory
COPY skills/ ./skills/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R tooloo:tooloo /app/data

# Switch to non-root user
USER tooloo

# Environment variables
ENV NODE_ENV=production
ENV PORT=4001
ENV HOST=0.0.0.0

# Expose port
EXPOSE 4001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4001/health || exit 1

# Start the application
CMD ["node", "apps/api/dist/index.js"]
