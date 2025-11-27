# Build stage for frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:frontend

# Final stage
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY --from=frontend-builder /app/src/web-app/dist ./src/web-app/dist
COPY . .

# Expose ports
EXPOSE 4000

# Start the application
CMD ["npm", "run", "start:synapsys"]
