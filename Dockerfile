# Dockerfile para MyDetailArea - Railway Deployment
# Optimizado para face-api.js models (.bin files)

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source files
COPY . .

# Build application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve@14.2.4

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/serve.json ./serve.json
COPY --from=builder /app/package.json ./package.json

# Expose port (Railway will inject $PORT)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/ || exit 1

# Start server
CMD ["sh", "-c", "serve dist -l ${PORT:-8080} -c serve.json --no-port-switching --no-clipboard"]
