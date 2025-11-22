FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create data directory
RUN mkdir -p /app/data && chmod 755 /app/data

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S tooloo -u 1001

# Change ownership of app directory
RUN chown -R tooloo:nodejs /app
USER tooloo

# Expose ports for all services
EXPOSE 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3123

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Default command (can be overridden in docker-compose)
CMD ["node", "servers/web-server.js"]