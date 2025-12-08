# TooLoo.ai Synapsys - Multi-Stage Production Dockerfile
# Version: 3.3.350
#
# This Dockerfile creates an optimized production image for TooLoo.ai
# with support for:
# - Multi-stage builds for minimal image size
# - Production-ready Node.js configuration
# - Optional LocalAI/Ollama sidecar support
# - Health checks and graceful shutdown
# - Non-root user for security

# =============================================================================
# STAGE 1: Dependencies
# =============================================================================
FROM node:20-slim AS deps

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# =============================================================================
# STAGE 2: Builder
# =============================================================================
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build frontend
RUN npm run build:frontend

# Run typecheck (optional, remove for faster builds)
# RUN npm run typecheck

# =============================================================================
# STAGE 3: Production Runtime
# =============================================================================
FROM node:20-slim AS runner

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    tini \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd --gid 1001 tooloo \
    && useradd --uid 1001 --gid 1001 -m tooloo

# Copy production dependencies only
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/tooloo.yaml ./

# Copy built frontend
COPY --from=builder /app/src/web-app/dist ./src/web-app/dist

# Create necessary directories with proper permissions
RUN mkdir -p /app/data /app/temp /app/logs \
    && chown -R tooloo:tooloo /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=4000 \
    VITE_PORT=5173 \
    DATA_DIR=/app/data \
    TEMP_DIR=/app/temp \
    LOG_LEVEL=info

# Expose ports
# 4000 - Main API/Socket.IO server
# 5173 - Vite preview (production static serving)
EXPOSE 4000 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:4000/api/v1/health || exit 1

# Switch to non-root user
USER tooloo

# Use tini as init process for proper signal handling
ENTRYPOINT ["/usr/bin/tini", "--"]

# Start the application
CMD ["node", "--loader", "ts-node/esm", "--no-warnings", "src/main.ts"]

# =============================================================================
# ALTERNATIVE: Development Stage
# =============================================================================
FROM node:20-slim AS development

WORKDIR /app

# Install development dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=development \
    PORT=4000

EXPOSE 4000 5173

CMD ["npm", "run", "dev:all"]
