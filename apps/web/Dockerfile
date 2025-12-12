# =============================================================================
# @tooloo/web - Production Dockerfile
# Multi-stage build for optimized static frontend
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy web app
COPY apps/web/ ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @tooloo/web

# Build arguments for environment
ARG VITE_API_URL=http://localhost:4001/api/v2
ARG VITE_SOCKET_URL=http://localhost:4001
ARG VITE_USE_V2=true

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_USE_V2=$VITE_USE_V2

# Build the application
RUN cd apps/web && pnpm build

# -----------------------------------------------------------------------------
# Stage 2: Production (nginx)
# -----------------------------------------------------------------------------
FROM nginx:alpine AS production

# Copy custom nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
